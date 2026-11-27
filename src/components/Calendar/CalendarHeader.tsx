import React, { useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Printer, 
  ListOrdered,
  Table,
  Menu,
  CalendarOff
} from 'lucide-react';
import { Department, Employee } from '../../types/trip';
import { NAMA_BULAN } from '../../utils/dateUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  viewMode: 'month' | 'week' | 'list';
  onViewModeChange: (mode: 'month' | 'week' | 'list') => void;
  selectedBidangId: string;
  onSelectBidangId: (id: string) => void;
  selectedEmployeeId: string;
  onSelectEmployeeId: (id: string) => void;
  selectedAsnStatus: string;
  onSelectAsnStatus: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  departments: Department[];
  employees: Employee[];
  onOpenNewTripModal: () => void;
  onOpenCheckerModal: () => void;
  onOpenMatrixModal: () => void;
  onPrintReport: () => void;
  onToggleSidebar?: () => void;
  isAdmin?: boolean;
  holidayCount?: number;
  onOpenHolidayModal?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  viewMode,
  onViewModeChange,
  selectedBidangId,
  onSelectBidangId,
  selectedEmployeeId,
  onSelectEmployeeId,
  selectedAsnStatus,
  onSelectAsnStatus,
  searchQuery,
  onSearchChange,
  departments,
  employees,
  onOpenNewTripModal,
  onOpenCheckerModal,
  onOpenMatrixModal,
  onPrintReport,
  onToggleSidebar,
  isAdmin = false,
  holidayCount = 0,
  onOpenHolidayModal,
}) => {
  const currentMonthName = NAMA_BULAN[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const headerDateLabel = useMemo(() => {
    if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const dayOfWeek = (curr.getDay() + 6) % 7;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() - dayOfWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const mMonth = NAMA_BULAN[monday.getMonth()].slice(0, 3);
      const sMonth = NAMA_BULAN[sunday.getMonth()].slice(0, 3);
      if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()} - ${sunday.getDate()} ${sMonth} ${sunday.getFullYear()}`;
      }
      return `${monday.getDate()} ${mMonth} - ${sunday.getDate()} ${sMonth} ${sunday.getFullYear()}`;
    }
    return `${currentMonthName} ${currentYear}`;
  }, [viewMode, currentDate, currentMonthName, currentYear]);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors">
      {/* Top Navbar */}
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* App Title & Date Nav */}
          <div className="flex items-center justify-between sm:justify-start gap-3.5 flex-wrap">
            <div className="flex items-center gap-2.5">
              {/* Sidebar Toggle (Icon Garis 3) - Visible on all screen sizes to slide sidebar & widen screen */}
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                  aria-label="Geser / Tutup Menu Samping"
                  title="Sembunyikan / Tampilkan Menu Samping (Perlebar Layar)"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  SIM-SPPD
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kalender Perjalanan Dinas
                </p>
              </div>
            </div>

            {/* Month & Year Navigation */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={onPrevMonth}
                title={viewMode === 'week' ? 'Minggu Sebelumnya (-7 Hari)' : 'Bulan Sebelumnya'}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:shadow-xs transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-3 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-36 text-center select-none">
                {headerDateLabel}
              </div>

              <button
                onClick={onNextMonth}
                title={viewMode === 'week' ? 'Minggu Selanjutnya (+7 Hari)' : 'Bulan Berikutnya'}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:shadow-xs transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onToday}
                className="ml-1 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
              >
                {viewMode === 'week' ? 'Minggu Ini' : 'Hari Ini'}
              </button>
            </div>
          </div>

          {/* Top Quick Actions (Matriks Dinas moved to left sidebar) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Checker */}
            <button
              onClick={onOpenCheckerModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
              title="Cek apakah ada pegawai yang bentrok atau siapa yang sedang luang"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cek Jadwal</span>
            </button>

            {/* Penanda Tanggal Merah / Cuti Bersama (Admin Only) */}
            {isAdmin && onOpenHolidayModal && (
              <button
                type="button"
                onClick={onOpenHolidayModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-2xs cursor-pointer"
                title="Kelola Penanda Tanggal Merah & Cuti Bersama (Khusus Admin)"
              >
                <CalendarOff className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Tanggal Merah</span>
                {holidayCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white tabular-nums">
                    {holidayCount}
                  </span>
                )}
              </button>
            )}

            {/* Cetak */}
            <button
              onClick={onPrintReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
              title="Cetak Rekap Agenda Bulan Ini (PDF / Print)"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Cetak</span>
            </button>

            {/* Tambah Perjalanan Dinas */}
            <button
              onClick={onOpenNewTripModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Perjalanan Dinas</span>
            </button>
          </div>
        </div>

        {/* Filter and View Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search Input */}
            <div className="relative min-w-52 flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Cari kegiatan, tujuan, no surat..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by Bidang */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <select
                value={selectedBidangId}
                onChange={(e) => onSelectBidangId(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ALL">Semua Bidang Pemberi Perintah</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    [{dept.inisial}] {dept.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status ASN */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedAsnStatus}
                onChange={(e) => onSelectAsnStatus(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                <option value="ALL">Semua Status Pegawai</option>
                <option value="PNS">Status: PNS</option>
                <option value="PPPK">Status: PPPK</option>
                <option value="PPPK PW">Status: PPPK PW</option>
                <option value="Non ASN/Lainnya">Status: Non ASN/Lainnya</option>
              </select>
            </div>

            {/* Filter by Pegawai (Alphabetically Sorted) */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedEmployeeId}
                onChange={(e) => onSelectEmployeeId(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-w-56 truncate"
              >
                <option value="ALL">Semua Pegawai (A-Z)</option>
                {[...employees]
                  .filter(emp => selectedAsnStatus === 'ALL' || (emp.statusAsn || 'PNS') === selectedAsnStatus)
                  .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }))
                  .map((emp) => {
                    const dept = departments.find(d => d.id === emp.bidangId);
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.nama} ({emp.statusAsn || 'PNS'}) [{dept?.inisial || 'DINAS'}] - {emp.jabatan}
                      </option>
                    );
                  })}
              </select>
            </div>

            {(selectedBidangId !== 'ALL' || selectedEmployeeId !== 'ALL' || selectedAsnStatus !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  onSelectBidangId('ALL');
                  onSelectEmployeeId('ALL');
                  onSelectAsnStatus('ALL');
                  onSearchChange('');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium px-2 py-1 cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start md:self-auto">
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kalender Bulan
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Daftar Agenda</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
