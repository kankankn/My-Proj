/**
 * Referensi Standar Pangkat & Golongan Ruang ASN (Aparatur Sipil Negara)
 * Republik Indonesia (PNS dan PPPK).
 */

export interface AsnPangkatOption {
  golongan: string;
  pangkat: string;
  label: string; // e.g. "Pembina (IV/a)"
  kategori: 'PNS' | 'PPPK';
}

export const DAFTAR_PANGKAT_ASN: AsnPangkatOption[] = [
  // Golongan IV (Pembina)
  { golongan: 'IV/e', pangkat: 'Pembina Utama', label: 'Pembina Utama (IV/e)', kategori: 'PNS' },
  { golongan: 'IV/d', pangkat: 'Pembina Utama Madya', label: 'Pembina Utama Madya (IV/d)', kategori: 'PNS' },
  { golongan: 'IV/c', pangkat: 'Pembina Utama Muda', label: 'Pembina Utama Muda (IV/c)', kategori: 'PNS' },
  { golongan: 'IV/b', pangkat: 'Pembina Tingkat I', label: 'Pembina Tingkat I (IV/b)', kategori: 'PNS' },
  { golongan: 'IV/a', pangkat: 'Pembina', label: 'Pembina (IV/a)', kategori: 'PNS' },

  // Golongan III (Penata)
  { golongan: 'III/d', pangkat: 'Penata Tingkat I', label: 'Penata Tingkat I (III/d)', kategori: 'PNS' },
  { golongan: 'III/c', pangkat: 'Penata', label: 'Penata (III/c)', kategori: 'PNS' },
  { golongan: 'III/b', pangkat: 'Penata Muda Tingkat I', label: 'Penata Muda Tingkat I (III/b)', kategori: 'PNS' },
  { golongan: 'III/a', pangkat: 'Penata Muda', label: 'Penata Muda (III/a)', kategori: 'PNS' },

  // Golongan II (Pengatur)
  { golongan: 'II/d', pangkat: 'Pengatur Tingkat I', label: 'Pengatur Tingkat I (II/d)', kategori: 'PNS' },
  { golongan: 'II/c', pangkat: 'Pengatur', label: 'Pengatur (II/c)', kategori: 'PNS' },
  { golongan: 'II/b', pangkat: 'Pengatur Muda Tingkat I', label: 'Pengatur Muda Tingkat I (II/b)', kategori: 'PNS' },
  { golongan: 'II/a', pangkat: 'Pengatur Muda', label: 'Pengatur Muda (II/a)', kategori: 'PNS' },

  // Golongan I (Juru)
  { golongan: 'I/d', pangkat: 'Juru Tingkat I', label: 'Juru Tingkat I (I/d)', kategori: 'PNS' },
  { golongan: 'I/c', pangkat: 'Juru', label: 'Juru (I/c)', kategori: 'PNS' },
  { golongan: 'I/b', pangkat: 'Juru Muda Tingkat I', label: 'Juru Muda Tingkat I (I/b)', kategori: 'PNS' },
  { golongan: 'I/a', pangkat: 'Juru Muda', label: 'Juru Muda (I/a)', kategori: 'PNS' },

  // Golongan PPPK (Golongan I s.d. XVII)
  { golongan: 'Gol. XVII', pangkat: 'PPPK Tingkat Utama', label: 'Golongan XVII (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. XVI', pangkat: 'PPPK Tingkat Madya', label: 'Golongan XVI (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. XV', pangkat: 'PPPK Tingkat Madya', label: 'Golongan XV (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. XIV', pangkat: 'PPPK Tingkat Madya', label: 'Golongan XIV (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. XIII', pangkat: 'PPPK Tingkat Muda', label: 'Golongan XIII (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. XII', pangkat: 'PPPK Tingkat Muda', label: 'Golongan XII (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. XI', pangkat: 'PPPK Tingkat Muda', label: 'Golongan XI (PPPK)', kategori: 'PPPK' },
  { golongan: 'Gol. X', pangkat: 'Ahli Pertama (S2)', label: 'Golongan X (PPPK S2)', kategori: 'PPPK' },
  { golongan: 'Gol. IX', pangkat: 'Ahli Pertama (S1/D4)', label: 'Golongan IX (PPPK S1/D4)', kategori: 'PPPK' },
  { golongan: 'Gol. VIII', pangkat: 'Mahir (D3)', label: 'Golongan VIII (PPPK D3)', kategori: 'PPPK' },
  { golongan: 'Gol. VII', pangkat: 'Terampil (D3)', label: 'Golongan VII (PPPK D3)', kategori: 'PPPK' },
  { golongan: 'Gol. V', pangkat: 'Pemula (SLTA)', label: 'Golongan V (PPPK SLTA)', kategori: 'PPPK' }
];
