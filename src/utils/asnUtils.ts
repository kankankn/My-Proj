import { AsnStatus } from '../types/trip';

export const ASN_STATUS_OPTIONS: AsnStatus[] = ['PNS', 'PPPK', 'PPPK PW', 'Non ASN/Lainnya'];

/**
 * Returns Tailwind CSS classes for Status ASN badge
 */
export function getAsnBadgeClass(status?: AsnStatus | string): string {
  switch (status) {
    case 'PPPK':
      return 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-300 dark:border-teal-700 font-semibold';
    case 'PPPK PW':
      return 'bg-orange-50 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300 dark:border-orange-700 font-semibold';
    case 'Non ASN/Lainnya':
      return 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-semibold';
    case 'PNS':
    default:
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-semibold';
  }
}

/**
 * Descriptive label for Status ASN
 */
export function getAsnFullLabel(status?: AsnStatus | string): string {
  switch (status) {
    case 'PPPK':
      return 'PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)';
    case 'PPPK PW':
      return 'PPPK PW (PPPK Paruh Waktu)';
    case 'Non ASN/Lainnya':
      return 'Non ASN / Tenaga Kontrak / Lainnya';
    case 'PNS':
    default:
      return 'PNS (Pegawai Negeri Sipil)';
  }
}
