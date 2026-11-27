import React from 'react';
import { Plus, Users, MapPin, AlertCircle } from 'lucide-react';
import { BusinessTrip, Department, Employee, HolidayEntry } from '../../types/trip';
import { CalendarCell } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';

interface DayCellProps {
  cell: CalendarCell;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  deptsMap?: Map<string, Department>;
  empsMap?: Map<string, Employee>;
  holiday?: HolidayEntry;
  onSelectDate: (dateKey: string) => void;
  onSelectTrip: (trip: BusinessTrip) => void;
  onAddTripToDate: (dateKey: string) => void;
}

export const DayCell: React.FC<DayCellProps> = React.memo(({
  cell,
  trips,
  departments,
  employees,
  deptsMap: propDeptsMap,
  empsMap: propEmpsMap,
  holiday,
  onSelectDate,
  onSelectTrip,
  onAddTripToDate,
}) => {
  const deptsMap = propDeptsMap || new Map(departments.map(d => [d.id, d]));
  const empsMap = propEmpsMap || new Map(employees.map(e => [e.id, e]));

  // Check unique participants across trips on this day
  const assignedEmpIds = new Set<string>();
  let hasDoubleAssignment = false;
  const duplicateEmpNames: string[] = [];

  for (const t of trips) {
    for (const eid of t.karyawanIds) {
      if (assignedEmpIds.has(eid)) {
        hasDoubleAssignment = true;
        const emp = empsMap.get(eid);
        if (emp && !duplicateEmpNames.includes(emp.nama)) {
          duplicateEmpNames.push(emp.nama);
        }
      }
      assignedEmpIds.add(eid);
    }
  }

  const isHoliday = Boolean(holiday);
  const isRedDay = cell.isWeekend || isHoliday;

  return (
    <div
      onClick={() => onSelectDate(cell.dateKey)}
      className={`group relative min-h-[125px] sm:min-h-[140px] p-2 border-b border-r border-slate-200 dark:border-slate-800 transition-all flex flex-col justify-between cursor-pointer select-none ${
        cell.isCurrentMonth
          ? isHoliday
            ? holiday?.jenis === 'Cuti Bersama'
              ? 'bg-amber-50/45 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/30'
              : 'bg-rose-50/55 dark:bg-rose-950/25 hover:bg-rose-50/90 dark:hover:bg-rose-950/35'
            : cell.isWeekend
            ? 'bg-slate-50/35 dark:bg-slate-850/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
          : 'bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-900/60'
      }`}
    >
      {/* Top Header of the Day Cell */}
      <div className="mb-1.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-full transition-colors tabular-nums ${
                cell.isToday
                  ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-200 dark:ring-indigo-900 shadow-xs'
                  : cell.isCurrentMonth
                  ? isRedDay
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-slate-800 dark:text-slate-200'
                  : isHoliday
                  ? 'text-rose-400 dark:text-rose-600'
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              {cell.dayNumber}
            </span>

            {cell.isToday && (
              <span className="hidden sm:inline text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-sm">
                Hari Ini
              </span>
            )}

            {/* Conflict Alert Icon if any double booking detected on this day */}
            {hasDoubleAssignment && (
              <span
                title={`PERINGATAN: Pegawai (${duplicateEmpNames.join(', ')}) terjadwal ganda di tanggal ini!`}
                className="inline-flex items-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-sm px-1 py-0.5 text-[10px] font-semibold animate-pulse"
              >
                <AlertCircle className="w-3 h-3 mr-0.5" />
                Bentrok
              </span>
            )}
          </div>

          {/* Quick Add Button (appears on hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTripToDate(cell.dateKey);
            }}
            title={`Tambah perjalanan pada ${cell.dateKey}`}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Holiday / Cuti Bersama marker */}
        {holiday && (
          <div
            title={`${holiday.jenis}: ${holiday.keterangan}`}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${
              holiday.jenis === 'Libur Nasional'
                ? 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            {holiday.jenis === 'Cuti Bersama' ? 'Cuti: ' : ''}
            {holiday.keterangan}
          </div>
        )}
      </div>

      {/* Trips List in this Cell */}
      <div className="space-y-1.5 flex-1 overflow-hidden">
        {trips.slice(0, 3).map((trip) => {
          const dept = deptsMap.get(trip.bidangId);
          const inisial = dept ? dept.inisial : 'DINAS';
          const participantCount = trip.karyawanIds.length;
          const firstEmpName = empsMap.get(trip.karyawanIds[0])?.nama.split(' ')[0] || 'Pegawai';

          return (
            <div
              key={trip.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTrip(trip);
              }}
              title={`${trip.namaKegiatan} (${dept?.nama || 'Bidang'}) - ${participantCount} Orang - Tujuan: ${trip.tujuan}`}
              className="px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-slate-800 dark:text-slate-100 shadow-2xs group/card"
            >
              {/* Badge Inisial Bidang & Tujuan */}
              <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                <span
                  style={getDeptBadgeStyle(dept)}
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 tracking-wider shadow-2xs ${
                    dept?.color?.badgeBg || 'bg-slate-700 text-white'
                  }`}
                >
                  {inisial}
                </span>

                <span className="font-medium text-slate-900 dark:text-white truncate leading-tight flex-1">
                  {trip.namaKegiatan}
                </span>
              </div>

              {/* Participants & Destination mini info */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                <div className="flex items-center gap-1 truncate max-w-[130px]">
                  <Users className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="truncate">
                    {participantCount === 1
                      ? firstEmpName
                      : `${participantCount} Pegawai`}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 truncate max-w-[90px] text-slate-400 dark:text-slate-500">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{trip.tujuan.split('(')[0].trim()}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* More trips counter */}
        {trips.length > 3 && (
          <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded px-1.5 py-0.5 text-center">
            +{trips.length - 3} kegiatan lainnya
          </div>
        )}
      </div>

      {/* Subtle indicator of activity if empty */}
      {trips.length === 0 && (
        <div className="text-[11px] text-slate-400 dark:text-slate-600 opacity-0 group-hover:opacity-100 text-center py-1 italic">
          + Klik untuk jadwal
        </div>
      )}
    </div>
  );
});
