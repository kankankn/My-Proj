export type AsnStatus = 'PNS' | 'PPPK' | 'PPPK PW' | 'Non ASN/Lainnya';

export interface Employee {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  pangkatGol?: string; // Pangkat / Golongan ASN, contoh: "Pembina (IV/a)", "Penata (III/c)", "Gol. IX"
  bidangId: string;
  avatarBg?: string;
  statusAsn?: AsnStatus;
}

export interface Department {
  id: string;
  nama: string;
  inisial: string; // e.g. "BID-REN", "SEKR", "B-KEU"
  deskripsi?: string;
  color: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    dotBg: string;
    hexColor?: string;
  };
}

export interface BusinessTrip {
  id: string;
  nomorSurat: string;
  namaKegiatan: string;
  bidangId: string; // Bidang pemberi perintah
  tujuan: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  karyawanIds: string[]; // List of employee IDs
  keterangan?: string;
  transportasi?: string;
  biayaAnggaran?: string;
  createdAt: string;
}

export interface ConflictRecord {
  employeeId: string;
  employeeName: string;
  conflictingDate: string;
  conflictingTripId: string;
  conflictingTripName: string;
  conflictingTripBidangInisial: string;
}

export type UserRole = 'admin' | 'operator';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  bidangId?: string;
  bidangNama?: string;
  bidangInisial?: string;
  isActive: boolean;
}

export interface OperatorAccount extends AuthUser {
  role: 'operator';
  bidangId: string;
  createdAt: string;
  updatedAt?: string;
}

export type ActivityLogCategory = 'sppd' | 'pegawai' | 'bidang' | 'operator' | 'auth' | 'libur' | 'sistem';
export type ActivityLogAction = 'Tambah' | 'Ubah' | 'Hapus' | 'Impor' | 'Login' | 'Logout' | 'Backup' | 'Restore';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actorUsername: string;
  actorDisplayName: string;
  actorRole: UserRole;
  bidangId?: string;
  bidangInisial?: string;
  bidangNama?: string;
  category: ActivityLogCategory;
  action: ActivityLogAction;
  title: string;
  details?: string;
}

export type HolidayType = 'Libur Nasional' | 'Cuti Bersama';

export interface HolidayEntry {
  id: string;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  jenis: HolidayType;
}
