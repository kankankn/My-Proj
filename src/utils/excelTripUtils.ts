import * as XLSX from 'xlsx';
import { BusinessTrip, Department, Employee, ConflictRecord } from '../types/trip';
import { NAMA_BULAN, getDatesBetween, checkTripConflicts } from './dateUtils';
import { matchDepartment } from './excelEmployeeUtils';
import { calculateEmployeeNameSimilarity } from './nameSimilarity';

export interface ParsedTripRow {
  tempId: string;
  excelId?: string;
  nomorSurat: string;
  namaKegiatan: string;
  bidangId: string;
  rawBidang: string;
  tujuan: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  karyawanIds: string[];
  rawPelaksana: string;
  unmatchedPelaksana: string[];
  transportasi?: string;
  biayaAnggaran?: string;
  keterangan?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isExisting: boolean;
  existingId?: string;
  conflicts: ConflictRecord[];
}

function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parse various Excel date representations into YYYY-MM-DD
 */
export function parseExcelDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';

  // 1. JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Excel numeric serial date
  if (typeof val === 'number' && val > 20000 && val < 90000) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const raw = String(val).trim();
  if (!raw || raw === '-') return '';

  // Numeric string Excel serial
  if (/^\d{5}(\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (num > 20000 && num < 90000) {
      const parsed = XLSX.SSF.parse_date_code(num);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
  }

  // 3. YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 5. Indonesian month names e.g. "10 Maret 2026" or "10 Mar 2026"
  const monthMap: Record<string, string> = {
    januari: '01', jan: '01',
    februari: '02', feb: '02', pebruari: '02',
    maret: '03', mar: '03',
    april: '04', apr: '04',
    mei: '05', may: '05',
    juni: '06', jun: '06',
    juli: '07', jul: '07',
    agustus: '08', agu: '08', agt: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    oktober: '10', okt: '10', oct: '10',
    november: '11', nov: '11', nopember: '11',
    desember: '12', des: '12', dec: '12',
  };

  const textMatch = raw.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const [, d, monthStr, y] = textMatch;
    const m = monthMap[monthStr];
    if (m) {
      return `${y}-${m}-${d.padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * Match raw Pelaksana text (e.g. "19850315 201001 1 002 - Dr. H. Ahmad Fauzi, S.T., M.Si.; Siti Rahmawati")
 * to employee IDs.
 */
function matchEmployeesFromCell(
  rawCell: string,
  employees: Employee[]
): { matchedIds: string[]; unmatched: string[] } {
  if (!rawCell || rawCell === '-') {
    return { matchedIds: [], unmatched: [] };
  }

  // Primary split by semicolon, newline, or pipe (preserves commas in academic titles like ", S.T., M.Si.")
  let segments = rawCell
    .split(/[;\n|]+/)
    .map(s => s.trim())
    .filter(Boolean);

  // If only 1 segment and it contains commas that aren't obviously academic degrees, try smart comma split if direct match fails
  if (segments.length === 1 && segments[0].includes(',')) {
    const whole = segments[0];
    const directMatch = findBestEmployeeMatch(whole, employees);
    if (!directMatch) {
      // Split by comma only if segments look like multiple names (length > 5 and not short degree suffix)
      const degreePattern = /^(s\.|m\.|ph\.?d|dr\.?|drs\.?|ir\.?|h\.?|hj\.?|a\.md|st|se|sh|mm|mt|msi|skom|spd|ssos)/i;
      const commaParts = whole.split(',').map(p => p.trim()).filter(Boolean);
      const nonDegreeParts = commaParts.filter(p => !degreePattern.test(p) && p.length >= 4);
      if (nonDegreeParts.length >= 2) {
        segments = nonDegreeParts;
      }
    }
  }

  const matchedSet = new Set<string>();
  const unmatched: string[] = [];

  for (const seg of segments) {
    // Strip leading list numbers like "1. " or "- "
    const cleanedSeg = seg.replace(/^\d+[.)]\s*|^[-•]\s*/, '').trim();
    if (!cleanedSeg) continue;

    const matched = findBestEmployeeMatch(cleanedSeg, employees);
    if (matched) {
      matchedSet.add(matched.id);
    } else {
      unmatched.push(cleanedSeg);
    }
  }

  return {
    matchedIds: Array.from(matchedSet),
    unmatched,
  };
}

function findBestEmployeeMatch(token: string, employees: Employee[]): Employee | null {
  const cleanDigits = token.replace(/\D/g, '');

  // 1. Exact NIP digits match (>= 8 digits)
  if (cleanDigits.length >= 8) {
    const byNip = employees.find(e => {
      const empDigits = e.nip.replace(/\D/g, '');
      return empDigits.length >= 8 && (cleanDigits.includes(empDigits) || empDigits.includes(cleanDigits));
    });
    if (byNip) return byNip;
  }

  // 2. If formatted as "NIP - Nama", strip leading NIP prefix
  const namePart = token.includes(' - ') ? token.split(' - ').slice(1).join(' - ').trim() : token;

  // 3. Similarity match against registered employees
  let bestEmp: Employee | null = null;
  let bestScore = 0;

  for (const emp of employees) {
    const res = calculateEmployeeNameSimilarity(namePart, emp);
    if (res.score > bestScore) {
      bestScore = res.score;
      bestEmp = emp;
    }
  }

  if (bestEmp && bestScore >= 72) {
    return bestEmp;
  }

  return null;
}

/**
 * Ekspor seluruh data SPPD di database + Matriks SPPD bulan aktif ke file Excel (.xlsx)
 */
export function exportDatabaseAndMatrixToExcel({
  trips,
  employees,
  departments,
  currentDate,
  filename,
}: {
  trips: BusinessTrip[];
  employees: Employee[];
  departments: Department[];
  currentDate: Date;
  filename?: string;
}): void {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const deptsMap = new Map(departments.map(d => [d.id, d]));
  const empsMap = new Map(employees.map(e => [e.id, e]));

  // =========================================================================
  // SHEET 1: Data_SPPD_Database (Format Siap Impor Kembali ke Database)
  // =========================================================================
  const sortedTrips = [...trips].sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));

  const dbRows = sortedTrips.map((trip, idx) => {
    const dept = deptsMap.get(trip.bidangId);
    const pelaksanaList = trip.karyawanIds
      .map(id => empsMap.get(id))
      .filter((e): e is Employee => !!e)
      .map(e => (e.nip && e.nip !== '-' ? `${e.nip} - ${e.nama}` : e.nama));

    return {
      'No': idx + 1,
      'ID Sistem': trip.id,
      'Nomor Surat': trip.nomorSurat || '-',
      'Nama Kegiatan': trip.namaKegiatan,
      'Inisial Bidang': dept?.inisial || '-',
      'Nama Bidang': dept?.nama || '-',
      'Tujuan': trip.tujuan,
      'Tanggal Mulai': trip.tanggalMulai,
      'Tanggal Selesai': trip.tanggalSelesai,
      'Pelaksana (NIP / Nama)': pelaksanaList.join('; ') || '-',
      'Jumlah Pelaksana': pelaksanaList.length,
      'Transportasi': trip.transportasi || '-',
      'Pembebanan Anggaran': trip.biayaAnggaran || '-',
      'Keterangan': trip.keterangan || '-',
    };
  });

  const dbSheet = XLSX.utils.json_to_sheet(
    dbRows.length > 0
      ? dbRows
      : [
          {
            'No': 1,
            'ID Sistem': '',
            'Nomor Surat': '094/001/SPPD/2026',
            'Nama Kegiatan': 'Contoh Kegiatan (Hapus jika kosong)',
            'Inisial Bidang': departments[0]?.inisial || 'BID-REN',
            'Nama Bidang': departments[0]?.nama || '-',
            'Tujuan': 'Jakarta',
            'Tanggal Mulai': `${year}-${String(month + 1).padStart(2, '0')}-01`,
            'Tanggal Selesai': `${year}-${String(month + 1).padStart(2, '0')}-03`,
            'Pelaksana (NIP / Nama)': employees[0] ? `${employees[0].nip} - ${employees[0].nama}` : '',
            'Jumlah Pelaksana': 1,
            'Transportasi': 'Kendaraan Dinas',
            'Pembebanan Anggaran': String(year),
            'Keterangan': '-',
          },
        ]
  );

  dbSheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 24 }, // ID Sistem
    { wch: 24 }, // Nomor Surat
    { wch: 38 }, // Nama Kegiatan
    { wch: 15 }, // Inisial Bidang
    { wch: 30 }, // Nama Bidang
    { wch: 24 }, // Tujuan
    { wch: 14 }, // Tanggal Mulai
    { wch: 14 }, // Tanggal Selesai
    { wch: 52 }, // Pelaksana
    { wch: 16 }, // Jumlah Pelaksana
    { wch: 22 }, // Transportasi
    { wch: 20 }, // Pembebanan Anggaran
    { wch: 32 }, // Keterangan
  ];

  // =========================================================================
  // SHEET 2: Matriks_SPPD (Tampilan Matriks Bulan Terpilih)
  // =========================================================================
  const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const employeeDateTripMap = new Map<string, Map<string, BusinessTrip>>();

  for (const trip of trips) {
    const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
    for (const d of dates) {
      const [y, m] = d.split('-').map(Number);
      if (y === year && m === month + 1) {
        for (const empId of trip.karyawanIds) {
          if (!employeeDateTripMap.has(empId)) {
            employeeDateTripMap.set(empId, new Map());
          }
          employeeDateTripMap.get(empId)!.set(d, trip);
        }
      }
    }
  }

  const matrixHeader = ['No', 'Nama Pegawai', 'NIP', 'Pangkat/Gol', 'Status', 'Jabatan', 'Bidang'];
  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day);
    const dayName = HARI_PENDEK[dateObj.getDay()];
    matrixHeader.push(`${String(day).padStart(2, '0')} (${dayName})`);
  }
  matrixHeader.push('Total Hari Dinas');

  const matrixRows: (string | number)[][] = [];
  employees.forEach((emp, idx) => {
    const dept = deptsMap.get(emp.bidangId);
    const row: (string | number)[] = [
      idx + 1,
      emp.nama,
      emp.nip || '-',
      emp.pangkatGol || '-',
      emp.statusAsn || 'PNS',
      emp.jabatan,
      dept?.inisial || '-',
    ];

    let totalDutyDays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const trip = employeeDateTripMap.get(emp.id)?.get(dateKey);
      if (trip) {
        totalDutyDays++;
        const tripDept = deptsMap.get(trip.bidangId);
        row.push(`[${tripDept?.inisial || 'SPPD'}] ${trip.tujuan}`);
      } else {
        const dateObj = new Date(year, month, day);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        row.push(isWeekend ? 'LIBUR' : '-');
      }
    }
    row.push(totalDutyDays);
    matrixRows.push(row);
  });

  const matrixSheet = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI MATRIKS SPPD PEGAWAI - ${NAMA_BULAN[month].toUpperCase()} ${year}`],
    [`Sistem Informasi Manajemen SPPD (SIM-SPPD) • Diekspor pada ${new Date().toLocaleDateString('id-ID')}`],
    [],
    matrixHeader,
    ...matrixRows,
  ]);

  const matrixCols = [
    { wch: 5 },  // No
    { wch: 28 }, // Nama
    { wch: 22 }, // NIP
    { wch: 20 }, // Pangkat/Gol
    { wch: 16 }, // Status
    { wch: 26 }, // Jabatan
    { wch: 12 }, // Bidang
  ];
  for (let i = 0; i < totalDays; i++) {
    matrixCols.push({ wch: 16 });
  }
  matrixCols.push({ wch: 16 });
  matrixSheet['!cols'] = matrixCols;

  // =========================================================================
  // SHEET 3: Referensi_Pegawai_Bidang
  // =========================================================================
  const refPegawaiRows = employees.map((e, i) => {
    const dept = deptsMap.get(e.bidangId);
    return {
      'No': i + 1,
      'Format Pelaksana (Copy ke Kolom Pelaksana)': e.nip && e.nip !== '-' ? `${e.nip} - ${e.nama}` : e.nama,
      'Nama Pegawai': e.nama,
      'NIP': e.nip || '-',
      'Pangkat/Gol': e.pangkatGol || '-',
      'Status': e.statusAsn || 'PNS',
      'Jabatan': e.jabatan,
      'Inisial Bidang': dept?.inisial || '-',
    };
  });
  const refSheet = XLSX.utils.json_to_sheet(refPegawaiRows);
  refSheet['!cols'] = [
    { wch: 5 },
    { wch: 48 },
    { wch: 30 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, dbSheet, 'Data_SPPD_Database');
  XLSX.utils.book_append_sheet(wb, matrixSheet, `Matriks_${NAMA_BULAN[month]}_${year}`);
  XLSX.utils.book_append_sheet(wb, refSheet, 'Referensi_Pegawai');

  const dateStr = new Date().toISOString().split('T')[0];
  const cleanFilename = filename || `Database_Matriks_SPPD_${NAMA_BULAN[month]}_${year}_${dateStr}`;
  XLSX.writeFile(wb, `${cleanFilename}.xlsx`);
}

/**
 * Unduh Template Excel kosong siap isi untuk upload SPPD ke database
 */
export function downloadTripTemplateExcel(
  departments: Department[],
  employees: Employee[]
): void {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');

  const emp1 = employees[0] ? (employees[0].nip && employees[0].nip !== '-' ? `${employees[0].nip} - ${employees[0].nama}` : employees[0].nama) : 'Ir. Bambang Sutrisno, M.M.';
  const emp2 = employees[1] ? (employees[1].nip && employees[1].nip !== '-' ? `${employees[1].nip} - ${employees[1].nama}` : employees[1].nama) : 'Rizky Pratama, S.Kom.';

  const templateRows = [
    {
      'Nomor Surat': `094/101/SPPD/${y}`,
      'Nama Kegiatan': 'Rapat Koordinasi Perencanaan Pembangunan Daerah',
      'Inisial Bidang': departments[0]?.inisial || 'BID-REN',
      'Tujuan': 'Bandung',
      'Tanggal Mulai': `${y}-${m}-10`,
      'Tanggal Selesai': `${y}-${m}-12`,
      'Pelaksana (NIP / Nama)': `${emp1}; ${emp2}`,
      'Transportasi': 'Kendaraan Dinas',
      'Pembebanan Anggaran': String(y),
      'Keterangan': 'Pisahkan beberapa pelaksana dengan tanda titik koma (;)',
    },
    {
      'Nomor Surat': `094/102/SPPD/${y}`,
      'Nama Kegiatan': 'Konsultasi Penyusunan Laporan Keuangan',
      'Inisial Bidang': departments[1]?.inisial || departments[0]?.inisial || 'B-KEU',
      'Tujuan': 'Jakarta',
      'Tanggal Mulai': `${y}-${m}-18`,
      'Tanggal Selesai': `${y}-${m}-19`,
      'Pelaksana (NIP / Nama)': emp2,
      'Transportasi': 'Kereta Api',
      'Pembebanan Anggaran': String(y),
      'Keterangan': 'Format tanggal YYYY-MM-DD atau DD/MM/YYYY',
    },
  ];

  const templateSheet = XLSX.utils.json_to_sheet(templateRows);
  templateSheet['!cols'] = [
    { wch: 24 },
    { wch: 40 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 52 },
    { wch: 20 },
    { wch: 20 },
    { wch: 45 },
  ];

  const deptRefRows = departments.map(d => ({
    'Inisial Bidang (Gunakan Kode Ini)': d.inisial,
    'Nama Lengkap Bidang': d.nama,
  }));
  const deptSheet = XLSX.utils.json_to_sheet(deptRefRows);
  deptSheet['!cols'] = [{ wch: 30 }, { wch: 42 }];

  const empRefRows = employees.map(e => ({
    'Copy ke Kolom Pelaksana': e.nip && e.nip !== '-' ? `${e.nip} - ${e.nama}` : e.nama,
    'Nama Pegawai': e.nama,
    'NIP': e.nip || '-',
    'Status': e.statusAsn || 'PNS',
    'Jabatan': e.jabatan,
  }));
  const empSheet = XLSX.utils.json_to_sheet(empRefRows);
  empSheet['!cols'] = [{ wch: 46 }, { wch: 30 }, { wch: 24 }, { wch: 16 }, { wch: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, templateSheet, 'Template_SPPD');
  XLSX.utils.book_append_sheet(wb, deptSheet, 'Daftar_Bidang');
  XLSX.utils.book_append_sheet(wb, empSheet, 'Daftar_Pegawai');

  XLSX.writeFile(wb, 'Template_Impor_SPPD_Database.xlsx');
}

/**
 * Parse file Excel/CSV SPPD untuk diimpor ke database
 */
export async function parseTripExcelFile(
  file: File,
  departments: Department[],
  employees: Employee[],
  existingTrips: BusinessTrip[]
): Promise<ParsedTripRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (workbook.SheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  // Prioritize known database sheet names if exported from this app
  const preferredSheet =
    workbook.SheetNames.find(name =>
      ['data_sppd_database', 'data_sppd', 'template_sppd'].includes(name.trim().toLowerCase())
    ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[preferredSheet];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });

  if (rawJson.length === 0) {
    throw new Error(`Sheet "${preferredSheet}" kosong atau tidak memiliki baris data.`);
  }

  // Existing lookup maps
  const existingById = new Map<string, BusinessTrip>();
  const existingBySurat = new Map<string, BusinessTrip>();
  existingTrips.forEach(t => {
    existingById.set(t.id, t);
    const cleanSurat = t.nomorSurat.trim().toLowerCase();
    if (cleanSurat && cleanSurat !== '-') {
      existingBySurat.set(cleanSurat, t);
    }
  });

  const parsedRows: ParsedTripRow[] = [];

  rawJson.forEach((row, idx) => {
    let excelId = '';
    let nomorSurat = '';
    let namaKegiatan = '';
    let inisialBidangVal = '';
    let namaBidangVal = '';
    let tujuan = '';
    let tanggalMulaiRaw: unknown = '';
    let tanggalSelesaiRaw: unknown = '';
    let rawPelaksana = '';
    let transportasi = '';
    let biayaAnggaran = '';
    let keterangan = '';

    for (const [key, val] of Object.entries(row)) {
      const lower = key.trim().toLowerCase();

      if (lower === 'id sistem' || lower === 'id sppd' || lower === 'id') {
        excelId = cleanString(val);
      } else if (lower.includes('nomor surat') || lower.includes('no surat') || lower.includes('no. surat') || lower === 'spt' || lower === 'sppd') {
        nomorSurat = cleanString(val);
      } else if (lower.includes('kegiatan') || lower.includes('uraian') || lower.includes('perihal')) {
        namaKegiatan = cleanString(val);
      } else if (lower.includes('inisial')) {
        inisialBidangVal = cleanString(val);
      } else if (lower.includes('bidang') || lower.includes('unit') || lower.includes('seksi')) {
        namaBidangVal = cleanString(val);
      } else if (lower.includes('tujuan') || lower.includes('lokasi') || lower.includes('tempat') || lower.includes('kota')) {
        tujuan = cleanString(val);
      } else if (lower.includes('mulai') || lower.includes('berangkat') || lower === 'dari tanggal') {
        tanggalMulaiRaw = val;
      } else if (lower.includes('selesai') || lower.includes('kembali') || lower === 'sampai tanggal') {
        tanggalSelesaiRaw = val;
      } else if (lower.includes('pelaksana') || lower.includes('pegawai') || lower.includes('karyawan') || lower.includes('petugas')) {
        if (!lower.includes('jumlah')) {
          rawPelaksana = cleanString(val);
        }
      } else if (lower.includes('transportasi') || lower.includes('kendaraan')) {
        transportasi = cleanString(val);
      } else if (lower.includes('anggaran') || lower.includes('biaya')) {
        biayaAnggaran = cleanString(val);
      } else if (lower.includes('keterangan') || lower.includes('catatan')) {
        keterangan = cleanString(val);
      }
    }

    const rawBidang = inisialBidangVal || namaBidangVal;

    // Skip completely empty rows
    if (!nomorSurat && !namaKegiatan && !tujuan && !rawPelaksana) {
      return;
    }

    const tanggalMulai = parseExcelDate(tanggalMulaiRaw);
    const tanggalSelesai = parseExcelDate(tanggalSelesaiRaw) || tanggalMulai;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!namaKegiatan) errors.push('Nama Kegiatan belum terisi');
    if (!tujuan) errors.push('Tujuan belum terisi');
    if (!tanggalMulai) errors.push('Tanggal Mulai tidak valid (gunakan YYYY-MM-DD atau DD/MM/YYYY)');
    if (tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai) {
      errors.push('Tanggal Selesai lebih awal daripada Tanggal Mulai');
    }

    // Match Department
    const matchedDept =
      matchDepartment(inisialBidangVal, departments) ||
      matchDepartment(namaBidangVal, departments);
    const finalBidangId = matchedDept ? matchedDept.id : (departments[0]?.id || '');
    if (!matchedDept) {
      warnings.push(
        rawBidang
          ? `Bidang "${rawBidang}" tidak dikenali (diarahkan ke ${departments[0]?.inisial || '-'})`
          : `Bidang kosong (diarahkan ke ${departments[0]?.inisial || '-'})`
      );
    }

    // Match Employees
    const { matchedIds, unmatched } = matchEmployeesFromCell(rawPelaksana, employees);
    if (matchedIds.length === 0) {
      errors.push('Belum ada pegawai pelaksana terdaftar yang cocok');
    }
    if (unmatched.length > 0) {
      warnings.push(`Nama tidak ditemukan: ${unmatched.join(', ')}`);
    }

    // Check existing record by ID or Nomor Surat
    const cleanSurat = nomorSurat.trim().toLowerCase();
    const matchedExisting =
      (excelId ? existingById.get(excelId) : undefined) ||
      (cleanSurat && cleanSurat !== '-' ? existingBySurat.get(cleanSurat) : undefined);

    // Anti-bentrok conflict check against existing trips (excluding self if updating)
    const conflicts =
      tanggalMulai && tanggalSelesai && matchedIds.length > 0
        ? checkTripConflicts(
            matchedIds,
            tanggalMulai,
            tanggalSelesai,
            existingTrips,
            employees,
            departments,
            matchedExisting?.id
          )
        : [];

    if (conflicts.length > 0) {
      warnings.push(`${conflicts.length} potensi bentrok jadwal dengan SPPD yang ada`);
    }

    parsedRows.push({
      tempId: `trip-imp-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      excelId: excelId || undefined,
      nomorSurat: nomorSurat || `094/IMP-${idx + 1}/${new Date().getFullYear()}`,
      namaKegiatan,
      bidangId: finalBidangId,
      rawBidang,
      tujuan,
      tanggalMulai,
      tanggalSelesai,
      karyawanIds: matchedIds,
      rawPelaksana,
      unmatchedPelaksana: unmatched,
      transportasi: transportasi && transportasi !== '-' ? transportasi : 'Kendaraan Dinas',
      biayaAnggaran:
        biayaAnggaran && biayaAnggaran !== '-'
          ? biayaAnggaran
          : tanggalMulai
          ? tanggalMulai.split('-')[0]
          : String(new Date().getFullYear()),
      keterangan: keterangan && keterangan !== '-' ? keterangan : '',
      isValid: errors.length === 0,
      errors,
      warnings,
      isExisting: !!matchedExisting,
      existingId: matchedExisting?.id,
      conflicts,
    });
  });

  return parsedRows;
}
