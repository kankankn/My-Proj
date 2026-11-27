import * as XLSX from 'xlsx';
import { Employee, Department, BusinessTrip, AsnStatus } from '../types/trip';
import { getDatesBetween } from './dateUtils';

export interface ParsedEmployeeRow {
  tempId: string;
  nama: string;
  nip: string;
  pangkatGol?: string;
  jabatan: string;
  bidangId: string;
  rawBidang: string;
  statusAsn?: AsnStatus;
  isValid: boolean;
  errors: string[];
  isExisting: boolean;
  existingId?: string;
}

/**
 * Clean string value from excel cell
 */
function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Match a raw department string to existing department
 */
export function matchDepartment(rawDept: string, departments: Department[]): Department | undefined {
  if (!rawDept) return undefined;
  const clean = rawDept.trim().toUpperCase();

  // 1. Direct match on inisial (e.g. "BID-REN", "SEKR", "B-KEU")
  const byInisial = departments.find(d => d.inisial.toUpperCase() === clean);
  if (byInisial) return byInisial;

  // 2. Direct match on name
  const byName = departments.find(d => d.nama.toUpperCase() === clean);
  if (byName) return byName;

  // 3. Partial contains match
  const byPartial = departments.find(d => 
    d.nama.toUpperCase().includes(clean) || 
    clean.includes(d.nama.toUpperCase()) ||
    clean.includes(d.inisial.toUpperCase())
  );
  if (byPartial) return byPartial;

  return undefined;
}

/**
 * Ekspor data pegawai ke file Excel (.xlsx)
 */
export function exportEmployeesToExcel(
  employees: Employee[], 
  departments: Department[], 
  filename = 'Data_Pegawai_SIM_SPPD'
): void {
  const deptsMap = new Map(departments.map(d => [d.id, d]));

  const rows = employees.map((emp, index) => {
    const dept = deptsMap.get(emp.bidangId);
    return {
      'No': index + 1,
      'Nama Lengkap': emp.nama,
      'NIP': emp.nip,
      'Pangkat/Gol': emp.pangkatGol || '-',
      'Status Pegawai': emp.statusAsn || 'PNS',
      'Jabatan': emp.jabatan,
      'Bidang': dept ? dept.nama : '-',
      'Inisial Bidang': dept ? dept.inisial : '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 6 },   // No
    { wch: 32 },  // Nama
    { wch: 25 },  // NIP
    { wch: 22 },  // Pangkat/Gol
    { wch: 15 },  // Status ASN
    { wch: 32 },  // Jabatan
    { wch: 36 },  // Bidang
    { wch: 16 }   // Inisial Bidang
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Pegawai');

  // Sheet 2: Referensi Bidang
  const refRows = departments.map(d => ({
    'Inisial Bidang': d.inisial,
    'Nama Lengkap Bidang': d.nama,
    'Deskripsi': d.deskripsi || '-'
  }));
  const refWorksheet = XLSX.utils.json_to_sheet(refRows);
  refWorksheet['!cols'] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, refWorksheet, 'Referensi_Bidang');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}

/**
 * Unduh template kosong untuk impor pegawai
 */
export function downloadEmployeeTemplate(departments: Department[]): void {
  // Sample data rows to show user how to fill
  const templateRows = [
    {
      'Nama Lengkap': 'Ir. Bambang Sutrisno, M.M.',
      'NIP': '19840512 200801 1 003',
      'Pangkat/Gol': 'Pembina (IV/a)',
      'Status (PNS/PPPK/PPPK PW/Non ASN/Lainnya)': 'PNS',
      'Jabatan': 'Kepala Bidang Perencanaan',
      'Inisial Bidang': departments[0]?.inisial || 'BID-REN'
    },
    {
      'Nama Lengkap': 'Rizky Pratama, S.Kom.',
      'NIP': '19920315 201402 1 002',
      'Pangkat/Gol': 'Golongan X (PPPK S2)',
      'Status (PNS/PPPK/PPPK PW/Non ASN/Lainnya)': 'PPPK',
      'Jabatan': 'Pranata Komputer Ahli Muda',
      'Inisial Bidang': departments[1]?.inisial || 'B-KEU'
    },
    {
      'Nama Lengkap': 'Dian Kusuma, S.Sos.',
      'NIP': '-',
      'Pangkat/Gol': '-',
      'Status (PNS/PPPK/PPPK PW/Non ASN/Lainnya)': 'Non ASN/Lainnya',
      'Jabatan': 'Tenaga Administrasi / Pendukung',
      'Inisial Bidang': departments[0]?.inisial || 'BID-REN'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  worksheet['!cols'] = [
    { wch: 32 },
    { wch: 25 },
    { wch: 24 },
    { wch: 30 },
    { wch: 32 },
    { wch: 18 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Pegawai');

  // Reference sheet with available department codes
  const refRows = departments.map(d => ({
    'Inisial Bidang (Gunakan Kode Ini)': d.inisial,
    'Nama Lengkap Bidang': d.nama
  }));
  const refWorksheet = XLSX.utils.json_to_sheet(refRows);
  refWorksheet['!cols'] = [
    { wch: 30 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(workbook, refWorksheet, 'Daftar_Inisial_Bidang');

  XLSX.writeFile(workbook, 'Template_Impor_Data_Pegawai.xlsx');
}

/**
 * Parse an Excel / CSV File into structured employee rows with validations
 */
export async function parseEmployeeExcelFile(
  file: File, 
  departments: Department[],
  existingEmployees: Employee[]
): Promise<ParsedEmployeeRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Take the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as raw array of objects (raw: false preserves formatted text like NIP)
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });

  if (rawJson.length === 0) {
    throw new Error('Sheet Excel kosong atau tidak memiliki data.');
  }

  const existingNipMap = new Map<string, Employee>();
  existingEmployees.forEach(e => {
    const cleanNip = e.nip.replace(/\s+/g, '');
    if (cleanNip && cleanNip !== '-') {
      existingNipMap.set(cleanNip, e);
    }
  });

  const parsedRows: ParsedEmployeeRow[] = [];

  rawJson.forEach((row, idx) => {
    // Find column keys flexibly
    let namaVal = '';
    let nipVal = '';
    let pangkatGolVal = '';
    let jabatanVal = '';
    let bidangVal = '';
    let statusAsnVal: AsnStatus = 'PNS';

    for (const [key, val] of Object.entries(row)) {
      const lowerKey = key.trim().toLowerCase();

      // Check Nama
      if (lowerKey.includes('nama') && !lowerKey.includes('bidang')) {
        namaVal = cleanString(val);
      } else if (lowerKey === 'name') {
        namaVal = cleanString(val);
      }
      
      // Check NIP
      if (lowerKey.includes('nip') || lowerKey.includes('identitas') || lowerKey.includes('nik') || lowerKey.includes('id pegawai')) {
        nipVal = cleanString(val);
      }

      // Check Pangkat / Golongan
      if (lowerKey.includes('pangkat') || lowerKey.includes('golongan') || lowerKey.includes('gol')) {
        pangkatGolVal = cleanString(val);
      }

      // Check Status Kepegawaian
      if (lowerKey.includes('asn') || lowerKey.includes('status')) {
        const rawStatus = cleanString(val).toUpperCase();
        if (
          rawStatus.includes('NON') ||
          rawStatus.includes('LAIN') ||
          rawStatus.includes('HONOR') ||
          rawStatus.includes('KONTRAK') ||
          rawStatus.includes('THL')
        ) {
          statusAsnVal = 'Non ASN/Lainnya';
        } else if (rawStatus.includes('PW') || rawStatus.includes('PARUH')) {
          statusAsnVal = 'PPPK PW';
        } else if (rawStatus.includes('PPPK')) {
          statusAsnVal = 'PPPK';
        } else if (rawStatus.includes('PNS')) {
          statusAsnVal = 'PNS';
        }
      }

      // Check Jabatan (exclude keys that are only pangkat or golongan)
      if (
        (lowerKey.includes('jabatan') || lowerKey.includes('posisi') || lowerKey.includes('role')) &&
        !lowerKey.includes('pangkat')
      ) {
        jabatanVal = cleanString(val);
      } else if (!jabatanVal && (lowerKey.includes('jabatan') || lowerKey.includes('posisi'))) {
        jabatanVal = cleanString(val);
      }

      // Check Bidang / Inisial
      if (lowerKey.includes('bidang') || lowerKey.includes('unit') || lowerKey.includes('divisi') || lowerKey.includes('inisial') || lowerKey.includes('seksi')) {
        bidangVal = cleanString(val);
      }
    }

    // Skip row if completely blank
    if (!namaVal && !nipVal && !jabatanVal && !bidangVal) {
      return;
    }

    if (statusAsnVal === 'Non ASN/Lainnya' && !nipVal) {
      nipVal = '-';
    }

    const errors: string[] = [];
    if (!namaVal) errors.push('Nama belum terisi');
    if (!nipVal && statusAsnVal !== 'Non ASN/Lainnya') errors.push('NIP belum terisi');
    if (!jabatanVal) errors.push('Jabatan belum terisi');

    // Match department
    const matchedDept = matchDepartment(bidangVal, departments);
    const finalBidangId = matchedDept ? matchedDept.id : (departments[0]?.id || '');
    if (!matchedDept && bidangVal) {
      errors.push(`Bidang "${bidangVal}" tidak dikenali (otomatis diarahkan ke ${departments[0]?.inisial})`);
    } else if (!bidangVal) {
      errors.push(`Bidang kosong (otomatis diarahkan ke ${departments[0]?.inisial})`);
    }

    // Check duplicate NIP against existing
    const cleanNip = nipVal.replace(/\s+/g, '');
    const existingEmp = cleanNip && cleanNip !== '-' ? existingNipMap.get(cleanNip) : undefined;

    parsedRows.push({
      tempId: `import-${idx}-${Date.now()}`,
      nama: namaVal,
      nip: nipVal,
      pangkatGol: pangkatGolVal || undefined,
      jabatan: jabatanVal,
      bidangId: finalBidangId,
      rawBidang: bidangVal,
      statusAsn: statusAsnVal,
      isValid: errors.filter(e => !e.includes('otomatis')).length === 0, // only hard errors (missing nama, nip, jabatan)
      errors,
      isExisting: !!existingEmp,
      existingId: existingEmp?.id
    });
  });

  return parsedRows;
}

/**
 * Ekspor Matriks Perjalanan Dinas Pegawai ke file Excel (.xlsx)
 */
export function exportTripMatrixToExcel({
  employees,
  trips,
  departments,
  currentDate,
  filename,
}: {
  employees: Employee[];
  trips: BusinessTrip[];
  departments: Department[];
  currentDate: Date;
  filename?: string;
}): void {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const deptsMap = new Map(departments.map((d) => [d.id, d]));

  const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Map employee ID -> dateKey -> BusinessTrip
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

  // Build headers
  const headerRow1 = ['No', 'Nama Pegawai', 'NIP', 'Jabatan', 'Bidang'];
  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day);
    const dayName = HARI_PENDEK[dateObj.getDay()];
    headerRow1.push(`${String(day).padStart(2, '0')} (${dayName})`);
  }
  headerRow1.push('Total Hari Dinas');

  // Build data rows
  const dataRows: (string | number)[][] = [];
  employees.forEach((emp, idx) => {
    const dept = deptsMap.get(emp.bidangId);
    const row: (string | number)[] = [
      idx + 1,
      emp.nama,
      emp.nip,
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
        row.push(`[${tripDept?.inisial || 'DINAS'}] ${trip.tujuan}`);
      } else {
        const dateObj = new Date(year, month, day);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        row.push(isWeekend ? 'LIBUR' : '-');
      }
    }
    row.push(totalDutyDays);
    dataRows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI MATRIKS PERJALANAN DINAS PEGAWAI - ${NAMA_BULAN[month].toUpperCase()} ${year}`],
    [`Sistem Informasi Manajemen SPPD (SIM-SPPD) • Dicetak pada ${new Date().toLocaleDateString('id-ID')}`],
    [],
    headerRow1,
    ...dataRows,
  ]);

  // Adjust column widths
  const colWidths = [
    { wch: 5 }, // No
    { wch: 28 }, // Nama
    { wch: 22 }, // NIP
    { wch: 26 }, // Jabatan
    { wch: 12 }, // Bidang
  ];
  for (let i = 0; i < totalDays; i++) {
    colWidths.push({ wch: 16 });
  }
  colWidths.push({ wch: 16 }); // Total
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Matriks_${NAMA_BULAN[month]}_${year}`);

  const cleanFilename = filename || `Matriks_Dinas_Pegawai_${NAMA_BULAN[month]}_${year}`;
  XLSX.writeFile(wb, `${cleanFilename}.xlsx`);
}
