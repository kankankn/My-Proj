import React, { useState, useMemo } from 'react';
import { 
  Table as TableIcon, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Printer, 
  Search, 
  Filter, 
  Users, 
  CheckCircle2, 
  Briefcase,
  AlertCircle,
  Menu,
  Download,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { BusinessTrip, Department, Employee, HolidayEntry } from '../../types/trip';
import { NAMA_BULAN, NAMA_HARI_PENDEK, getDatesBetween } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';
import {
  exportDatabaseAndMatrixToExcel,
  downloadTripTemplateExcel
} from '../../utils/excelTripUtils';
import { TripImportModal } from '../Modals/TripImportModal';

interface MatrixViewProps {
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  holidays?: HolidayEntry[];
  initialDate?: Date;
  onSelectTrip: (trip: BusinessTrip) => void;
  onToggleSidebar?: () => void;
  onBulkImportTrips?: (updatedTrips: BusinessTrip[]) => void;
  lockedBidangId?: string;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  trips,
  departments,
  employees,
  holidays = [],
  initialDate = new Date(),
  onSelectTrip,
  onToggleSidebar,
  onBulkImportTrips,
  lockedBidangId,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBidangFilter, setSelectedBidangFilter] = useState('ALL');
  const [selectedAsnFilter, setSelectedAsnFilter] = useState('ALL');
  const [filterOnlyActive, setFilterOnlyActive] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<{ message: string; targetDate?: Date } | null>(null);
  const canUseExcel = !lockedBidangId;

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const deptsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  const holidaysMap = useMemo(() => new Map(holidays.map(h => [h.tanggal, h])), [holidays]);

  // Pre-calculate: empId -> dateKey -> BusinessTrip
  const employeeDutyMap = useMemo(() => {
    const map = new Map<string, Map<string, BusinessTrip>>();
    for (const trip of trips) {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      for (const d of dates) {
        const [y, m] = d.split('-').map(Number);
        if (y === currentYear && m === currentMonth + 1) {
          for (const empId of trip.karyawanIds) {
            if (!map.has(empId)) {
              map.set(empId, new Map());
            }
            map.get(empId)!.set(d, trip);
          }
        }
      }
    }
    return map;
  }, [trips, currentYear, currentMonth]);

  // Count active duty days per employee in this month
  const dutyDaysCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [empId, dateMap] of employeeDutyMap.entries()) {
      counts.set(empId, dateMap.size);
    }
    return counts;
  }, [employeeDutyMap]);

  // Active employee IDs with at least 1 trip this month
  const activeEmployeeIdsThisMonth = useMemo(() => {
    return new Set(employeeDutyMap.keys());
  }, [employeeDutyMap]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 1. Filter only active duty this month
      if (filterOnlyActive && !activeEmployeeIdsThisMonth.has(emp.id)) {
        return false;
      }

      // 2. Filter by Bidang
      if (selectedBidangFilter !== 'ALL' && emp.bidangId !== selectedBidangFilter) {
        return false;
      }

      // 3. Filter by ASN Status
      if (selectedAsnFilter !== 'ALL' && (emp.statusAsn || 'PNS') !== selectedAsnFilter) {
        return false;
      }

      // 4. Search query (name, nip, jabatan, bidang)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dept = deptsMap.get(emp.bidangId);
        const matchName = emp.nama.toLowerCase().includes(q);
        const matchNip = emp.nip?.toLowerCase().includes(q);
        const matchJabatan = emp.jabatan.toLowerCase().includes(q);
        const matchDept = dept?.nama.toLowerCase().includes(q) || dept?.inisial.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchJabatan && !matchDept) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const countA = dutyDaysCountMap.get(a.id) || 0;
      const countB = dutyDaysCountMap.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
    });
  }, [employees, filterOnlyActive, activeEmployeeIdsThisMonth, selectedBidangFilter, selectedAsnFilter, searchQuery, deptsMap, dutyDaysCountMap]);

  // Calendar days array for header
  const daysArray = useMemo(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(currentYear, currentMonth, dayNum);
      const dayOfWeek = (dateObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      const isWeekend = dayOfWeek >= 5; // Saturday (5), Sunday (6)
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayName = NAMA_HARI_PENDEK[dayOfWeek];
      const holiday = holidaysMap.get(dateKey);

      return {
        dayNum,
        dayName,
        dateKey,
        isWeekend,
        holiday,
        isRedDay: isWeekend || Boolean(holiday),
        isToday: dateKey === todayKey,
      };
    });
  }, [currentYear, currentMonth, daysInMonth, holidaysMap]);

  // Overall Statistics for this month
  const totalDutyDaysSum = useMemo(() => {
    let sum = 0;
    for (const count of dutyDaysCountMap.values()) {
      sum += count;
    }
    return sum;
  }, [dutyDaysCountMap]);

  const tripsThisMonthCount = useMemo(() => {
    const tripIds = new Set<string>();
    for (const dateMap of employeeDutyMap.values()) {
      for (const trip of dateMap.values()) {
        tripIds.add(trip.id);
      }
    }
    return tripIds.size;
  }, [employeeDutyMap]);

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top Header - Menempel pada bagian atas layar seperti pada Dashboard */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors print:hidden">
        {/* Top Navbar */}
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            
            {/* Title & Month Navigation */}
            <div className="flex items-center justify-between sm:justify-start gap-3.5 flex-wrap">
              <div className="flex items-center gap-2.5">
                {/* Sidebar Toggle (Icon Garis 3) - Visible on all screen sizes to slide sidebar & widen screen */}
                {onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    aria-label="Geser / Tutup Menu Samping"
                    title="Sembunyikan / Tampilkan Menu Samping (Perlebar Layar)"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <TableIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      Matriks SPPD
                    </h1>
                    {canUseExcel && (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        Format Excel
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pemetaan Jadwal Perjalanan Dinas Seluruh Pegawai
                  </p>
                </div>
              </div>

              {/* Month & Year Navigation (Sama persis seperti pada Dashboard) */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={handlePrevMonth}
                  title="Bulan Sebelumnya"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:shadow-xs transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="px-3 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-36 text-center select-none">
                  {NAMA_BULAN[currentMonth]} {currentYear}
                </div>

                <button
                  onClick={handleNextMonth}
                  title="Bulan Berikutnya"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:shadow-xs transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="ml-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer"
                >
                  Bulan Ini
                </button>
              </div>
            </div>

            {/* Action buttons: Ekspor/Impor Excel Database (Admin only) & Cetak PDF */}
            <div className="flex items-center gap-2 flex-wrap">
              {canUseExcel && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadTripTemplateExcel(departments, employees)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                    title="Unduh Template Excel kosong siap isi untuk upload SPPD ke database"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Format Excel</span>
                  </button>

                  {onBulkImportTrips && (
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs cursor-pointer"
                      title="Impor / Upload data SPPD dari file Excel ke dalam database"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Impor Excel</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      exportDatabaseAndMatrixToExcel({
                        trips,
                        employees,
                        departments,
                        currentDate: selectedDate,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                    title="Ekspor seluruh data SPPD di database & Matriks bulanan ke format Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Ekspor Excel</span>
                  </button>
                </>
              )}

              <button
                onClick={handlePrint}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                title="Cetak matriks atau simpan sebagai dokumen PDF"
              >
                <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Bar (Menempel di header sticky bersama top bar) */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Search Input */}
              <div className="relative min-w-52 flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari pegawai / NIP / jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Bidang */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <select
                  value={selectedBidangFilter}
                  onChange={(e) => setSelectedBidangFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                >
                  <option value="ALL">Semua Bidang</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      [{d.inisial}] {d.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status Pegawai */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedAsnFilter}
                  onChange={(e) => setSelectedAsnFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                >
                  <option value="ALL">Semua Status Pegawai</option>
                  <option value="PNS">Hanya PNS</option>
                  <option value="PPPK">Hanya PPPK</option>
                  <option value="PPPK PW">Hanya PPPK PW</option>
                  <option value="Non ASN/Lainnya">Hanya Non ASN/Lainnya</option>
                </select>
              </div>

              {/* Checkbox: Hanya yang bertugas */}
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-750">
                <input
                  type="checkbox"
                  checked={filterOnlyActive}
                  onChange={(e) => setFilterOnlyActive(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Hanya yang Bertugas ({activeEmployeeIdsThisMonth.size})
                </span>
              </label>

              {(selectedBidangFilter !== 'ALL' || selectedAsnFilter !== 'ALL' || filterOnlyActive || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBidangFilter('ALL');
                    setSelectedAsnFilter('ALL');
                    setFilterOnlyActive(false);
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 font-semibold cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Alert Notification after Import */}
        {alertSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{alertSuccess.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {alertSuccess.targetDate &&
                (alertSuccess.targetDate.getMonth() !== currentMonth ||
                  alertSuccess.targetDate.getFullYear() !== currentYear) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (alertSuccess.targetDate) {
                        setSelectedDate(new Date(alertSuccess.targetDate.getFullYear(), alertSuccess.targetDate.getMonth(), 1));
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Tampilkan {NAMA_BULAN[alertSuccess.targetDate.getMonth()]} {alertSuccess.targetDate.getFullYear()}
                  </button>
                )}
              <button
                type="button"
                onClick={() => setAlertSuccess(null)}
                className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Pegawai</div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {filteredEmployees.length} <span className="text-[10px] text-slate-400 font-normal">dari {employees.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Pegawai Bertugas</div>
              <div className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                {activeEmployeeIdsThisMonth.size} Pegawai
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400">SPPD Bulan Ini</div>
              <div className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                {tripsThisMonthCount} Perjalanan
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-blue-700 dark:text-blue-400">Total Hari Dinas Pegawai</div>
              <div className="font-bold text-blue-800 dark:text-blue-200 text-sm">
                {totalDutyDaysSum} Hari-Pegawai
              </div>
            </div>
          </div>
        </div>

      {/* Main Table Container - Full Width Spread */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                {/* Fixed Columns */}
                <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 py-2.5 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-700">
                  No
                </th>
                <th className="sticky left-12 z-20 bg-slate-100 dark:bg-slate-800 py-2.5 px-3 min-w-56 border-r border-slate-200 dark:border-slate-700 shadow-xs">
                  Nama Pegawai & Jabatan
                </th>
                <th className="py-2.5 px-2.5 min-w-24 text-center border-r border-slate-200 dark:border-slate-700">
                  Bidang &amp; Status
                </th>
                <th className="py-2.5 px-3 min-w-16 text-center border-r border-slate-300 dark:border-slate-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold">
                  Total
                </th>

                {/* Day Columns */}
                {daysArray.map(day => (
                  <th
                    key={day.dateKey}
                    title={day.holiday ? `${day.holiday.jenis}: ${day.holiday.keterangan}` : undefined}
                    className={`py-2 px-1 text-center min-w-9.5 w-9.5 border-r border-slate-200 dark:border-slate-700/80 transition-colors ${
                      day.isToday 
                        ? 'bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 font-bold ring-1 ring-inset ring-indigo-400' 
                        : day.holiday
                          ? 'bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold'
                          : day.isWeekend 
                            ? 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-medium' 
                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-normal uppercase leading-tight">
                      {day.dayName}
                    </div>
                    <div className={`text-xs mt-0.5 tabular-nums ${day.isToday ? 'font-black' : ''}`}>
                      {day.dayNum}
                    </div>
                    {day.holiday && (
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-600 mx-auto mt-0.5" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4 + daysArray.length} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada pegawai yang sesuai filter</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau opsi filter bidang/ASN</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => {
                  const dept = deptsMap.get(emp.bidangId);
                  const dutyDaysCount = dutyDaysCountMap.get(emp.id) || 0;
                  const empDutyDates = employeeDutyMap.get(emp.id);

                  return (
                    <tr 
                      key={emp.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Fixed: Row Index */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 py-2 px-2 text-center text-slate-400 text-xs border-r border-slate-200 dark:border-slate-800">
                        {index + 1}
                      </td>

                      {/* Fixed: Employee Name & Details */}
                      <td className="sticky left-12 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 py-2 px-3 border-r border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                          {emp.nama}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {emp.pangkatGol && (
                            <span className="font-semibold text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                              {emp.pangkatGol}
                            </span>
                          )}
                          {emp.nip && <span className="font-mono text-[10px] text-slate-400">{emp.nip}</span>}
                          {emp.jabatan && <span>•</span>}
                          <span className="truncate max-w-44">{emp.jabatan}</span>
                        </div>
                      </td>

                      {/* Bidang & Status (1 Kolom Ringkas) */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {dept ? (
                            <span
                              style={getDeptBadgeStyle(dept)}
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs leading-tight ${dept.color.badgeBg}`}
                              title={dept.nama}
                            >
                              {dept.inisial}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                          <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded-full leading-tight whitespace-nowrap ${getAsnBadgeClass(emp.statusAsn || 'PNS')}`}>
                            {emp.statusAsn || 'PNS'}
                          </span>
                        </div>
                      </td>

                      {/* Total Duty Days */}
                      <td className={`py-2 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 ${
                        dutyDaysCount > 0 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' 
                          : 'text-slate-400'
                      }`}>
                        {dutyDaysCount}
                      </td>

                      {/* Date Cells */}
                      {daysArray.map(day => {
                        const trip = empDutyDates?.get(day.dateKey);
                        const tripDept = trip ? deptsMap.get(trip.bidangId) : undefined;

                        return (
                          <td
                            key={day.dateKey}
                            title={day.holiday ? `${day.holiday.jenis}: ${day.holiday.keterangan}` : undefined}
                            className={`py-1.5 px-0.5 text-center border-r border-slate-100 dark:border-slate-800 transition-colors ${
                              day.isToday
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                                : day.holiday
                                  ? 'bg-rose-50/70 dark:bg-rose-950/30'
                                  : day.isWeekend 
                                    ? 'bg-rose-50/40 dark:bg-rose-950/20' 
                                    : ''
                            }`}
                          >
                            {trip ? (
                              <button
                                type="button"
                                onClick={() => onSelectTrip(trip)}
                                style={getDeptBadgeStyle(tripDept)}
                                className={`w-full py-1 px-0.5 rounded-md text-[10px] font-bold shadow-2xs hover:scale-105 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center leading-tight truncate group/cell ${tripDept?.color?.badgeBg || 'bg-indigo-600 text-white'}`}
                                title={`Kegiatan: ${trip.namaKegiatan}\nTujuan: ${trip.tujuan}\nBidang: ${tripDept?.nama || '-'}\nTanggal: ${trip.tanggalMulai} s.d ${trip.tanggalSelesai}\nKlik untuk lihat detail SPPD`}
                              >
                                <span className="truncate w-full block">
                                  {tripDept ? tripDept.inisial : 'SPPD'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 text-[10px] select-none">
                                •
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend / Info Bar at bottom of table */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 print:hidden">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Keterangan:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800" />
              <span>Hari Libur / Tanggal Merah / Cuti Bersama</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-100 dark:bg-indigo-950 border border-indigo-400" />
              <span>Hari Ini</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-indigo-600 text-white">
                [IN]
              </span>
              <span>Sedang Bertugas (Inisial Bidang) — Klik sel untuk rincian</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredEmployees.length}</strong> pegawai
          </div>
        </div>
      </div>
      </main>

      {/* Modal Impor Data SPPD dari Excel ke Database (Admin Only) */}
      {canUseExcel && onBulkImportTrips && (
        <TripImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          departments={departments}
          employees={employees}
          existingTrips={trips}
          lockedBidangId={lockedBidangId}
          onImportSuccess={(updatedTrips, message, targetDate) => {
            onBulkImportTrips(updatedTrips);
            setAlertSuccess({ message, targetDate });
            setTimeout(() => setAlertSuccess(null), 8000);
          }}
        />
      )}
    </div>
  );
};
