import { BusinessTrip, Employee, Department, ConflictRecord } from '../types/trip';

// Indonesian Month Names
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const NAMA_HARI = [
  'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
];

export const NAMA_HARI_PENDEK = [
  'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'
];

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD into a local Date object without timezone shift
 */
export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Generate all dates between start and end (inclusive) as YYYY-MM-DD strings
 */
export function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const start = parseDateKey(startDateStr);
  const end = parseDateKey(endDateStr);
  
  if (start > end) {
    return [startDateStr];
  }

  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Format date string to DD/MM/YYYY (e.g. "12/10/2026")
 */
export function formatDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseDateKey(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format Indonesian localized date string in DD/MM/YYYY order
 * e.g. "12/10/2026" or "Senin, 12/10/2026"
 */
export function formatIndonesianDate(dateStr: string, includeDayName = false): string {
  if (!dateStr) return '';
  const date = parseDateKey(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  if (includeDayName) {
    // 0 = Sunday, 1 = Monday, ...
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
    const dayName = NAMA_HARI[dayOfWeek];
    return `${dayName}, ${day}/${month}/${year}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Format date range in DD/MM/YYYY order (e.g. "12/10/2026 - 14/10/2026")
 */
export function formatDateRange(startStr: string, endStr: string): string {
  if (!startStr) return '';
  if (!endStr || startStr === endStr) {
    return formatIndonesianDate(startStr);
  }

  return `${formatIndonesianDate(startStr)} - ${formatIndonesianDate(endStr)}`;
}

/**
 * Calculate total days in a trip
 */
export function calculateDurationDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const start = parseDateKey(startStr);
  const end = parseDateKey(endStr);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Core validation: Check if employees have conflicts.
 * RULE: Setiap orang yang melakukan perjalanan TIDAK DAPAT melakukan 2 kali perjalanan dalam 1 hari.
 */
export function checkTripConflicts(
  targetEmployeeIds: string[],
  startDate: string,
  endDate: string,
  allTrips: BusinessTrip[],
  allEmployees: Employee[],
  allDepartments: Department[],
  excludeTripId?: string
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  const requestedDates = getDatesBetween(startDate, endDate);

  const employeesMap = new Map(allEmployees.map(e => [e.id, e]));
  const deptsMap = new Map(allDepartments.map(d => [d.id, d]));

  for (const empId of targetEmployeeIds) {
    const employee = employeesMap.get(empId);
    const empName = employee ? employee.nama : 'Pegawai';

    // Find any trip that includes this employee and is not the trip currently being edited
    for (const trip of allTrips) {
      if (excludeTripId && trip.id === excludeTripId) continue;
      if (!trip.karyawanIds.includes(empId)) continue;

      const tripDates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      
      // Find intersection
      for (const d of requestedDates) {
        if (tripDates.includes(d)) {
          const dept = deptsMap.get(trip.bidangId);
          conflicts.push({
            employeeId: empId,
            employeeName: empName,
            conflictingDate: d,
            conflictingTripId: trip.id,
            conflictingTripName: trip.namaKegiatan,
            conflictingTripBidangInisial: dept ? dept.inisial : 'DINAS'
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Check if a single employee is busy on a given date
 */
export function isEmployeeBusyOnDate(
  empId: string,
  dateStr: string,
  allTrips: BusinessTrip[],
  excludeTripId?: string
): { isBusy: boolean; trip?: BusinessTrip } {
  for (const trip of allTrips) {
    if (excludeTripId && trip.id === excludeTripId) continue;
    if (trip.karyawanIds.includes(empId)) {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      if (dates.includes(dateStr)) {
        return { isBusy: true, trip };
      }
    }
  }
  return { isBusy: false };
}

/**
 * Calendar Grid Builder (Monday-start grid)
 */
export interface CalendarCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function buildMonthCalendarMatrix(year: number, month: number): CalendarCell[][] {
  const todayKey = formatDateKey(new Date());
  
  // First day of current month
  const firstDay = new Date(year, month, 1);
  // Last day of current month
  const lastDay = new Date(year, month + 1, 0);

  // Day of week: 0 is Sunday, 1 is Monday ... 6 is Saturday
  // We want Monday = 0, Tuesday = 1, ... Sunday = 6
  let firstDayIndex = firstDay.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; // Sunday is index 6

  const matrix: CalendarCell[][] = [];
  let currentWeek: CalendarCell[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const dateObj = new Date(year, month - 1, dayNum);
    const dateKey = formatDateKey(dateObj);
    const dayOfWeek = (dateObj.getDay() + 6) % 7;
    currentWeek.push({
      date: dateObj,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isWeekend: dayOfWeek >= 5
    });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateObj = new Date(year, month, d);
    const dateKey = formatDateKey(dateObj);
    const dayOfWeek = (dateObj.getDay() + 6) % 7;

    currentWeek.push({
      date: dateObj,
      dateKey,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      isWeekend: dayOfWeek >= 5
    });

    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month padding to fill up to 35 or 42 cells (5 or 6 rows)
  let nextDayNum = 1;
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    const dateObj = new Date(year, month + 1, nextDayNum);
    const dateKey = formatDateKey(dateObj);
    const dayOfWeek = (dateObj.getDay() + 6) % 7;
    currentWeek.push({
      date: dateObj,
      dateKey,
      dayNumber: nextDayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isWeekend: dayOfWeek >= 5
    });
    nextDayNum++;
  }

  if (currentWeek.length === 7) {
    matrix.push(currentWeek);
  }

  // If only 4 or 5 rows and we want full 6 rows for uniform heights
  while (matrix.length < 6) {
    const extraWeek: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(year, month + 1, nextDayNum);
      const dateKey = formatDateKey(dateObj);
      const dayOfWeek = (dateObj.getDay() + 6) % 7;
      extraWeek.push({
        date: dateObj,
        dateKey,
        dayNumber: nextDayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        isWeekend: dayOfWeek >= 5
      });
      nextDayNum++;
    }
    matrix.push(extraWeek);
  }

  return matrix;
}
