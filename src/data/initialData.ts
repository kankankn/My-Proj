import { Department, Employee, BusinessTrip } from '../types/trip';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-sekr',
    nama: 'Sekretariat Utama',
    inisial: 'SEKR',
    deskripsi: 'Koordinasi umum, kepegawaian, dan tata laksana kedinasan',
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-600 text-white',
      dotBg: 'bg-blue-500'
    }
  },
  {
    id: 'dept-ren',
    nama: 'Bidang Perencanaan & Program',
    inisial: 'BID-REN',
    deskripsi: 'Penyusunan rencana kerja, evaluasi kinerja, dan pelaporan',
    color: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      badgeBg: 'bg-indigo-600 text-white',
      dotBg: 'bg-indigo-500'
    }
  },
  {
    id: 'dept-keu',
    nama: 'Bidang Keuangan & Aset',
    inisial: 'B-KEU',
    deskripsi: 'Pengelolaan anggaran, verifikasi SPJ, dan perbendaharaan',
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-600 text-white',
      dotBg: 'bg-emerald-500'
    }
  },
  {
    id: 'dept-ti',
    nama: 'Bidang Teknologi Informasi',
    inisial: 'BID-TI',
    deskripsi: 'Infrastruktur server, jaringan, dan transformasi digital',
    color: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      badgeBg: 'bg-cyan-600 text-white',
      dotBg: 'bg-cyan-500'
    }
  },
  {
    id: 'dept-ppk1',
    nama: 'PPK Wilayah I (Operasional Proyek)',
    inisial: 'PPK-1',
    deskripsi: 'Pengawasan pelaksanaan teknis dan monitoring fisik lapangan',
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-600 text-white',
      dotBg: 'bg-amber-500'
    }
  },
  {
    id: 'dept-insp',
    nama: 'Inspektorat / Pengawasan Internal',
    inisial: 'INSP',
    deskripsi: 'Audit internal, review kepatuhan, dan pendampingan SPIP',
    color: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-600 text-white',
      dotBg: 'bg-rose-500'
    }
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    nip: '19840512 200801 1 003',
    nama: 'Bambang Sutrisno, S.T., M.M.',
    pangkatGol: 'Pembina (IV/a)',
    jabatan: 'Kepala Bidang Perencanaan',
    bidangId: 'dept-ren',
    statusAsn: 'PNS',
    avatarBg: 'bg-indigo-600'
  },
  {
    id: 'emp-2',
    nip: '19881120 201012 2 004',
    nama: 'Siti Nurhaliza, S.E., Ak.',
    pangkatGol: 'Penata (III/c)',
    jabatan: 'Bendahara Pengeluaran',
    bidangId: 'dept-keu',
    statusAsn: 'PNS',
    avatarBg: 'bg-emerald-600'
  },
  {
    id: 'emp-3',
    nip: '19920315 201402 1 002',
    nama: 'Rizky Pratama, S.Kom.',
    pangkatGol: 'Golongan X (PPPK S2)',
    jabatan: 'Pranata Komputer Ahli Muda',
    bidangId: 'dept-ti',
    statusAsn: 'PPPK',
    avatarBg: 'bg-cyan-600'
  },
  {
    id: 'emp-4',
    nip: '19820708 200604 1 005',
    nama: 'Ir. Hendra Gunawan',
    pangkatGol: 'Pembina Tingkat I (IV/b)',
    jabatan: 'Pejabat Pembuat Komitmen (PPK)',
    bidangId: 'dept-ppk1',
    statusAsn: 'PNS',
    avatarBg: 'bg-amber-600'
  },
  {
    id: 'emp-5',
    nip: '19900914 201201 2 007',
    nama: 'Dewi Lestari, S.H.',
    pangkatGol: 'Penata Muda Tingkat I (III/b)',
    jabatan: 'Analis Kepegawaian & Tata Usaha',
    bidangId: 'dept-sekr',
    statusAsn: 'PNS',
    avatarBg: 'bg-blue-600'
  },
  {
    id: 'emp-6',
    nip: '19860125 200903 1 001',
    nama: 'Agus Setiawan, S.E.',
    pangkatGol: 'Penata Tingkat I (III/d)',
    jabatan: 'Auditor Muda Inspektorat',
    bidangId: 'dept-insp',
    statusAsn: 'PNS',
    avatarBg: 'bg-rose-600'
  },
  {
    id: 'emp-7',
    nip: '19950410 201902 1 008',
    nama: 'Dimas Fakhri, S.T.',
    pangkatGol: 'Golongan VII (PPPK)',
    jabatan: 'Teknisi Jaringan & Infrastruktur',
    bidangId: 'dept-ti',
    statusAsn: 'PPPK PW',
    avatarBg: 'bg-cyan-700'
  },
  {
    id: 'emp-8',
    nip: '19910618 201503 2 003',
    nama: 'Fitri Handayani, S.Sos.',
    pangkatGol: 'Golongan IX (PPPK S1/D4)',
    jabatan: 'Perencana Program Kerja',
    bidangId: 'dept-ren',
    statusAsn: 'PPPK',
    avatarBg: 'bg-indigo-700'
  }
];

// Helper to determine year and month based on current date
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth(); // 0-indexed

function getDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export const INITIAL_TRIPS: BusinessTrip[] = [
  {
    id: 'trip-1',
    nomorSurat: '090/ST-SEKR/2026/041',
    namaKegiatan: 'Koordinasi Sinkronisasi Data Kepegawaian BKN Pusat',
    bidangId: 'dept-sekr',
    tujuan: 'Jakarta Timur (Gedung BKN Pusat)',
    tanggalMulai: getDateString(currentYear, currentMonth, 3),
    tanggalSelesai: getDateString(currentYear, currentMonth, 4),
    karyawanIds: ['emp-5'],
    keterangan: 'Membawa berkas usulan kenaikan pangkat periode Oktober',
    transportasi: 'Kereta Cepat Whoosh',
    biayaAnggaran: 'APBD T.A. 2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'trip-2',
    nomorSurat: '090/ST-REN/2026/088',
    namaKegiatan: 'Musrenbang Provinsi & Konsultasi Rencana Kerja 2027',
    bidangId: 'dept-ren',
    tujuan: 'Bandung (Bappeda Provinsi Jawa Barat)',
    tanggalMulai: getDateString(currentYear, currentMonth, 7),
    tanggalSelesai: getDateString(currentYear, currentMonth, 8),
    karyawanIds: ['emp-1', 'emp-8'],
    keterangan: 'Pemaparan indikator capaian kinerja program strategis',
    transportasi: 'Kendaraan Dinas',
    biayaAnggaran: 'DIPA Satker 2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'trip-3',
    nomorSurat: '090/ST-KEU/2026/032',
    namaKegiatan: 'Konsultasi Rekonsiliasi SAKTI & LPJ Triwulan III',
    bidangId: 'dept-keu',
    tujuan: 'Jakarta Pusat (KPPN & Ditjen Perbendaharaan)',
    tanggalMulai: getDateString(currentYear, currentMonth, 12),
    tanggalSelesai: getDateString(currentYear, currentMonth, 13),
    karyawanIds: ['emp-2'],
    keterangan: 'Penyelesaian selisih pembukuan kas belanja modal',
    transportasi: 'Kereta Api Eksekutif',
    biayaAnggaran: 'DIPA 2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'trip-4',
    nomorSurat: '090/ST-PPK1/2026/112',
    namaKegiatan: 'Monitoring & Uji Petik Proyek Konstruksi Fisik Tahap II',
    bidangId: 'dept-ppk1',
    tujuan: 'Cirebon (Lokasi Pekerjaan Lapangan)',
    tanggalMulai: getDateString(currentYear, currentMonth, 15),
    tanggalSelesai: getDateString(currentYear, currentMonth, 16),
    karyawanIds: ['emp-4'],
    keterangan: 'Pengecekan spesifikasi material beton dan progres mingguan',
    transportasi: 'Mobil Operasional PPK',
    biayaAnggaran: 'Belanja Modal Fisik 2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'trip-5',
    nomorSurat: '090/ST-TI/2026/054',
    namaKegiatan: 'Bimtek Integrasi Keamanan Siber & Cloud Goverment',
    bidangId: 'dept-ti',
    tujuan: 'Yogyakarta (Grand Mercure Hotel)',
    tanggalMulai: getDateString(currentYear, currentMonth, 21),
    tanggalSelesai: getDateString(currentYear, currentMonth, 23),
    karyawanIds: ['emp-3', 'emp-7'],
    keterangan: 'Pelatihan CSIRT dan audit sertifikasi ISO 27001',
    transportasi: 'Pesawat Udara Garuda',
    biayaAnggaran: 'DIPA BSSN / Kerjasama',
    createdAt: new Date().toISOString()
  },
  {
    id: 'trip-6',
    nomorSurat: '090/ST-INSP/2026/019',
    namaKegiatan: 'Review Tata Kelola Pengadaan Barang dan Jasa',
    bidangId: 'dept-insp',
    tujuan: 'Semarang (Kantor Wilayah BPKP)',
    tanggalMulai: getDateString(currentYear, currentMonth, 27),
    tanggalSelesai: getDateString(currentYear, currentMonth, 28),
    karyawanIds: ['emp-6'],
    keterangan: 'Klarifikasi tindak lanjut hasil evaluasi LHP',
    transportasi: 'Kereta Api Argo Muria',
    biayaAnggaran: 'Pengawasan Internal 2026',
    createdAt: new Date().toISOString()
  }
];
