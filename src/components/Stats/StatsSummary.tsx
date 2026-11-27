import React from 'react';
import { 
  Briefcase, 
  CalendarDays, 
  Users, 
  ShieldCheck 
} from 'lucide-react';
import { BusinessTrip, Department, Employee } from '../../types/trip';
import { formatDateKey, getDatesBetween, NAMA_BULAN } from '../../utils/dateUtils';

interface StatsSummaryProps {
  currentDate: Date;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({
  currentDate,
  trips,
  departments,
  employees,
}) => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const todayKey = formatDateKey(new Date());

  // Filter trips that touch this month
  const monthTrips = trips.filter(trip => {
    const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
    return dates.some(d => {
      const [y, m] = d.split('-').map(Number);
      return y === currentYear && m === currentMonth + 1;
    });
  });

  // Filter trips that touch this year (Total Kegiatan Per Tahun)
  const yearTrips = trips.filter(trip => {
    const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
    return dates.some(d => {
      const [y] = d.split('-').map(Number);
      return y === currentYear;
    });
  });

  // Calculate busy employees today
  const todayTrips = trips.filter(trip => {
    const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
    return dates.includes(todayKey);
  });

  const todayBusyStaffIds = new Set<string>();
  todayTrips.forEach(t => t.karyawanIds.forEach(id => todayBusyStaffIds.add(id)));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* 1. Total Bulan Ini */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Perjalanan {NAMA_BULAN[currentMonth]}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-slate-900 dark:text-white">{monthTrips.length}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Kegiatan</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Total Kegiatan Per Tahun (Ditempatkan di samping perjalanan per bulan) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Total Perjalanan Tahun {currentYear}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-sky-600 dark:text-sky-400">{yearTrips.length}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Kegiatan / Thn</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <CalendarDays className="w-4 h-4" />
        </div>
      </div>

      {/* 3. Pegawai Sedang Bertugas Hari Ini */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sedang Dinas Hari Ini</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{todayBusyStaffIds.size}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">/ {employees.length} Pegawai</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Proteksi Kesalahan Jadwal / Anti-Bentrok */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Proteksi Kesalahan Jadwal</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Aktif & Tervalidasi</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Maks 1 dinas/pegawai/hari</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

