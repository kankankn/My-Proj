import React from 'react';
import { 
  buildMonthCalendarMatrix, 
  NAMA_HARI, 
  NAMA_BULAN,
  getDatesBetween, 
  formatIndonesianDate, 
  formatDateKey 
} from '../../utils/dateUtils';
import { DayCell } from './DayCell';
import { BusinessTrip, Department, Employee, HolidayEntry } from '../../types/trip';
import { Calendar, MapPin, Users, Building, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDeptBadgeStyle } from '../../utils/colorUtils';

interface CalendarViewProps {
  currentDate: Date;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  holidays?: HolidayEntry[];
  viewMode: 'month' | 'week' | 'list';
  onSelectDate: (dateKey: string) => void;
  onSelectTrip: (trip: BusinessTrip) => void;
  onAddTripToDate: (dateKey: string) => void;
  onChangeDate?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  trips,
  departments,
  employees,
  holidays = [],
  viewMode,
  onSelectDate,
  onSelectTrip,
  onAddTripToDate,
  onChangeDate,
}) => {
  const deptsMap = React.useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  const empsMap = React.useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const holidaysMap = React.useMemo(() => new Map(holidays.map(h => [h.tanggal, h])), [holidays]);

  // Pre-index trips by dateKey for ultra fast lookups
  const tripsByDate = React.useMemo(() => {
    const map = new Map<string, BusinessTrip[]>();
    for (const trip of trips) {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      for (const d of dates) {
        const list = map.get(d) || [];
        list.push(trip);
        map.set(d, list);
      }
    }
    return map;
  }, [trips]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 1. MONTH VIEW
  if (viewMode === 'month') {
    const monthMatrix = buildMonthCalendarMatrix(year, month);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Day of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 text-xs font-semibold text-slate-600 dark:text-slate-300 select-none">
          {NAMA_HARI.map((dayName, idx) => {
            const isWeekend = idx >= 5;
            return (
              <div
                key={dayName}
                className={`py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                  isWeekend
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="hidden sm:inline">{dayName.toUpperCase()}</span>
                <span className="sm:hidden">{dayName.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>

        {/* 6 Weeks Calendar Grid */}
        <div className="grid grid-cols-7 border-collapse">
          {monthMatrix.flatMap((week, weekIdx) =>
            week.map((cell, dayIdx) => (
              <DayCell
                key={`${weekIdx}-${dayIdx}-${cell.dateKey}`}
                cell={cell}
                trips={tripsByDate.get(cell.dateKey) || []}
                departments={departments}
                employees={employees}
                deptsMap={deptsMap}
                empsMap={empsMap}
                holiday={holidaysMap.get(cell.dateKey)}
                onSelectDate={onSelectDate}
                onSelectTrip={onSelectTrip}
                onAddTripToDate={onAddTripToDate}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // 2. WEEK VIEW
  if (viewMode === 'week') {
    const curr = new Date(currentDate);
    const dayOfWeek = (curr.getDay() + 6) % 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        dateKey: formatDateKey(d),
        dayName: NAMA_HARI[i],
        isToday: formatDateKey(d) === formatDateKey(new Date()),
        isWeekend: i >= 5
      };
    });

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Week Navigation Toolbar */}
        <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Shift Week Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(monday);
                prev.setDate(prev.getDate() - 7);
                onChangeDate?.(prev);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Geser ke Minggu Sebelumnya (-7 Hari)"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Minggu Sebelumnya</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = new Date(monday);
                next.setDate(next.getDate() + 7);
                onChangeDate?.(next);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Geser ke Minggu Selanjutnya (+7 Hari)"
            >
              <span>Minggu Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onChangeDate?.(new Date())}
              className="px-2.5 py-1.5 font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors cursor-pointer"
            >
              Minggu Ini
            </button>
          </div>

          {/* Week Info Badge */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              {formatIndonesianDate(formatDateKey(monday))} s/d {formatIndonesianDate(formatDateKey(sunday))}
            </span>
          </div>

          {/* Direct Week Selector Pills for Current Month */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">
              Pilih Minggu ({NAMA_BULAN[month]}):
            </span>
            {[
              { label: 'Minggu 1', day: 1 },
              { label: 'Minggu 2', day: 8 },
              { label: 'Minggu 3', day: 15 },
              { label: 'Minggu 4', day: 22 },
              ...(daysInCurrentMonth >= 29 ? [{ label: 'Minggu 5', day: 29 }] : [])
            ].map((w) => {
              const targetDateObj = new Date(year, month, w.day);
              const isCurrentWeek = targetDateObj >= monday && targetDateObj <= sunday;

              return (
                <button
                  key={w.label}
                  type="button"
                  onClick={() => onChangeDate?.(targetDateObj)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    isCurrentWeek
                      ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={`Buka ${w.label} (${NAMA_BULAN[month]})`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 min-h-[500px]">
          {weekDays.map((day) => {
            const dayTrips = tripsByDate.get(day.dateKey) || [];
            const dayHoliday = holidaysMap.get(day.dateKey);
            const isRedDay = day.isWeekend || Boolean(dayHoliday);
            return (
              <div
                key={day.dateKey}
                className={`p-3.5 flex flex-col justify-between ${
                  day.isToday
                    ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                    : dayHoliday
                    ? 'bg-rose-50/40 dark:bg-rose-950/20'
                    : day.isWeekend
                    ? 'bg-slate-50/40 dark:bg-slate-800/40'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="pb-2 mb-3 border-b border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${isRedDay ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          {day.dayName}
                        </p>
                        <p className={`text-sm sm:text-base font-bold font-mono tracking-tight ${day.isToday ? 'text-indigo-600 dark:text-indigo-400' : isRedDay ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
                          {formatIndonesianDate(day.dateKey)}
                        </p>
                      </div>

                      <button
                        onClick={() => onAddTripToDate(day.dateKey)}
                        title={`Tambah perjalanan pada ${day.dayName}`}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {dayHoliday && (
                      <div className={`px-2 py-0.5 rounded text-[10px] font-semibold truncate border ${
                        dayHoliday.jenis === 'Libur Nasional'
                          ? 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`} title={dayHoliday.keterangan}>
                        {dayHoliday.jenis}: {dayHoliday.keterangan}
                      </div>
                    )}
                  </div>

                  {/* Trip cards */}
                  <div className="space-y-2">
                    {dayTrips.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">
                        Tidak ada perjalanan
                      </p>
                    ) : (
                      dayTrips.map((trip) => {
                        const dept = deptsMap.get(trip.bidangId);
                        return (
                          <div
                            key={trip.id}
                            onClick={() => onSelectTrip(trip)}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span
                                style={getDeptBadgeStyle(dept)}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                                  dept?.color?.badgeBg || 'bg-slate-700 text-white'
                                }`}
                              >
                                {dept?.inisial || 'DINAS'}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                {dept?.nama}
                              </span>
                            </div>

                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1.5">
                              {trip.namaKegiatan}
                            </h4>

                            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{trip.tujuan}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate font-medium">
                                  {trip.karyawanIds.length} Pegawai
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onSelectDate(day.dateKey)}
                  className="mt-3 w-full py-1 text-center text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium border-t border-slate-100 dark:border-slate-800 pt-2 cursor-pointer"
                >
                  Detail Hari Ini →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. LIST / AGENDA VIEW
  const sortedTrips = [...trips].sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Daftar Agenda Perjalanan Dinas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan {sortedTrips.length} kegiatan perjalanan dinas
          </p>
        </div>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium">Belum ada agenda perjalanan dinas yang sesuai filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedTrips.map((trip) => {
            const dept = deptsMap.get(trip.bidangId);
            const assignedEmployees = trip.karyawanIds
              .map(id => empsMap.get(id))
              .filter(Boolean) as Employee[];

            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      style={getDeptBadgeStyle(dept)}
                      className={`text-xs font-bold px-2 py-0.5 rounded-sm tracking-wide ${
                        dept?.color?.badgeBg || 'bg-slate-700 text-white'
                      }`}
                    >
                      [{dept?.inisial || 'DINAS'}]
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {dept?.nama}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      • No: {trip.nomorSurat}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    {trip.namaKegiatan}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        {formatIndonesianDate(trip.tanggalMulai)}
                        {trip.tanggalMulai !== trip.tanggalSelesai &&
                          ` s/d ${formatIndonesianDate(trip.tanggalSelesai)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{trip.tujuan}</span>
                    </div>

                    {trip.transportasi && (
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Transport: {trip.transportasi}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Staff */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Pegawai Pelaksana ({assignedEmployees.length}):
                    </span>
                    {assignedEmployees.map((emp) => (
                      <span
                        key={emp.id}
                        className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full"
                      >
                        {emp.nama}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                    Lihat Detail SPPD →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
