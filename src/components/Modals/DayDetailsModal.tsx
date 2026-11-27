import React from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Car, 
  Plus, 
  Briefcase, 
  CheckCircle,
  CalendarOff,
  Trash2
} from 'lucide-react';
import { BusinessTrip, Department, Employee, HolidayEntry, HolidayType } from '../../types/trip';
import { formatIndonesianDate, getDatesBetween } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string | null;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  holiday?: HolidayEntry;
  isAdmin?: boolean;
  onSaveHoliday?: (entry: Omit<HolidayEntry, 'id'>) => void;
  onDeleteHoliday?: (id: string) => void;
  onSelectTrip: (trip: BusinessTrip) => void;
  onAddTripToDate: (dateKey: string) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  onClose,
  dateKey,
  trips,
  departments,
  employees,
  holiday,
  isAdmin = false,
  onSaveHoliday,
  onDeleteHoliday,
  onSelectTrip,
  onAddTripToDate,
}) => {
  const [showQuickHolidayForm, setShowQuickHolidayForm] = React.useState(false);
  const [quickJenis, setQuickJenis] = React.useState<HolidayType>('Libur Nasional');
  const [quickKeterangan, setQuickKeterangan] = React.useState('');

  React.useEffect(() => {
    setShowQuickHolidayForm(false);
    setQuickKeterangan(holiday?.keterangan || '');
    setQuickJenis(holiday?.jenis || 'Libur Nasional');
  }, [dateKey, holiday, isOpen]);

  if (!isOpen || !dateKey) return null;

  const deptsMap = new Map(departments.map(d => [d.id, d]));
  const empsMap = new Map(employees.map(e => [e.id, e]));

  // Find all trips touching this specific date
  const activeTripsToday = trips.filter(trip => {
    const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
    return dates.includes(dateKey);
  });

  // Track busy employees on this date
  const busyEmpIds = new Set<string>();
  const busyEmpDetails: { employee: Employee; trip: BusinessTrip }[] = [];

  for (const trip of activeTripsToday) {
    for (const empId of trip.karyawanIds) {
      busyEmpIds.add(empId);
      const emp = empsMap.get(empId);
      if (emp) {
        busyEmpDetails.push({ employee: emp, trip });
      }
    }
  }

  // Available employees (not on any trip today)
  const availableEmployees = employees.filter(emp => !busyEmpIds.has(emp.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {formatIndonesianDate(dateKey, true)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTripsToday.length} Kegiatan Dinas • {busyEmpIds.size} Pegawai Bertugas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Holiday Banner or Admin Quick Marker */}
          {holiday ? (
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                holiday.jenis === 'Libur Nasional'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarOff className="w-4 h-4 shrink-0" />
                <div>
                  <span className="font-bold">{holiday.jenis}:</span>{' '}
                  <span>{holiday.keterangan}</span>
                </div>
              </div>
              {isAdmin && onDeleteHoliday && (
                <button
                  type="button"
                  onClick={() => onDeleteHoliday(holiday.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/80 dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Penanda</span>
                </button>
              )}
            </div>
          ) : isAdmin && onSaveHoliday ? (
            showQuickHolidayForm ? (
              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <CalendarOff className="w-3.5 h-3.5" />
                    Tandai Tanggal Merah / Cuti Bersama
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickHolidayForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={quickJenis}
                    onChange={(e) => setQuickJenis(e.target.value as HolidayType)}
                    className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="Libur Nasional">Libur Nasional</option>
                    <option value="Cuti Bersama">Cuti Bersama</option>
                  </select>
                  <input
                    type="text"
                    value={quickKeterangan}
                    onChange={(e) => setQuickKeterangan(e.target.value)}
                    placeholder="Keterangan libur (mis. Cuti Bersama Lebaran)"
                    className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!quickKeterangan.trim()) return;
                      onSaveHoliday({
                        tanggal: dateKey,
                        jenis: quickJenis,
                        keterangan: quickKeterangan.trim(),
                      });
                      setShowQuickHolidayForm(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shrink-0"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowQuickHolidayForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <CalendarOff className="w-3.5 h-3.5" />
                  <span>Tandai sebagai Tanggal Merah / Cuti Bersama</span>
                </button>
              </div>
            )
          ) : null}
          
          {/* Section 1: Active Trips */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Agenda Kegiatan Perjalanan Dinas
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onAddTripToDate(dateKey);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kegiatan Hari Ini</span>
              </button>
            </div>

            {activeTripsToday.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                <p className="text-xs">Tidak ada agenda perjalanan dinas terjadwal pada tanggal ini.</p>
                <button
                  onClick={() => {
                    onClose();
                    onAddTripToDate(dateKey);
                  }}
                  className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Buat Jadwal Perjalanan Dinas Baru
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTripsToday.map((trip) => {
                  const dept = deptsMap.get(trip.bidangId);
                  const assignedStaff = trip.karyawanIds
                    .map(id => empsMap.get(id))
                    .filter(Boolean) as Employee[];

                  return (
                    <div
                      key={trip.id}
                      onClick={() => {
                        onClose();
                        onSelectTrip(trip);
                      }}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
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
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {trip.nomorSurat}
                        </span>
                      </div>

                      <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 mb-2">
                        {trip.namaKegiatan}
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{trip.tujuan}</span>
                        </div>
                        {trip.transportasi && (
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{trip.transportasi}</span>
                          </div>
                        )}
                      </div>

                      {/* Participant chips */}
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Petugas:
                          </span>
                          {assignedStaff.map(emp => (
                            <span
                              key={emp.id}
                              className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full font-medium"
                            >
                              <span>{emp.nama}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.1 rounded ${getAsnBadgeClass(emp.statusAsn)}`}>
                                {emp.statusAsn || 'PNS'}
                              </span>
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                          Rincian →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Availability Matrix on This Day */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
              <span>Status Ketersediaan Pegawai Hari Ini</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 normal-case font-normal">
                {availableEmployees.length} Standby / {busyEmpIds.size} Sedang Dinas
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Sedang Dinas */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 mb-2">
                  <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Sedang Melakukan Perjalanan ({busyEmpDetails.length})</span>
                </div>
                {busyEmpDetails.length === 0 ? (
                  <p className="text-xs text-amber-800 dark:text-amber-400 italic">Tidak ada pegawai yang sedang dinas hari ini.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {busyEmpDetails.map(({ employee, trip }) => {
                      const dept = deptsMap.get(trip.bidangId);
                      return (
                        <div
                          key={`${employee.id}-${trip.id}`}
                          className="p-1.5 bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{employee.nama}</p>
                            <span className={`text-[8px] font-bold px-1 py-0.1 rounded ${getAsnBadgeClass(employee.statusAsn)}`}>
                              {employee.statusAsn || 'PNS'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            [{dept?.inisial}] {trip.namaKegiatan}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tersedia di Kantor */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tersedia di Kantor / Bebas Tugas ({availableEmployees.length})</span>
                </div>
                {availableEmployees.length === 0 ? (
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 italic">Semua pegawai sedang dinas.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {availableEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-1.5 bg-white dark:bg-slate-800 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-xs flex items-center justify-between"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{emp.nama}</p>
                            <span className={`text-[8px] font-bold px-1 py-0.1 rounded ${getAsnBadgeClass(emp.statusAsn)}`}>
                              {emp.statusAsn || 'PNS'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{emp.jabatan}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          Tersedia
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
