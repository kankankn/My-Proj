import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Menu,
  History,
  BarChart3,
  Search,
  Filter,
  Download,
  Trash2,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ActivityLogCategory,
  ActivityLogEntry,
  BusinessTrip,
  Department,
  Employee,
} from '../../types/trip';
import { getDatesBetween, NAMA_BULAN } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface LogViewProps {
  logs: ActivityLogEntry[];
  trips: BusinessTrip[];
  employees: Employee[];
  departments: Department[];
  isAdmin: boolean;
  currentUsername: string;
  onToggleSidebar?: () => void;
  onClearLogs?: () => void;
}

type LogSubTab = 'workload' | 'activity';
type PeriodMode = 'month' | 'year' | 'all';
type WorkloadSort = 'days-desc' | 'trips-desc' | 'name-asc';

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  sppd: 'SPPD',
  pegawai: 'Pegawai',
  bidang: 'Bidang',
  operator: 'Operator',
  auth: 'Autentikasi',
  libur: 'Tanggal Merah',
  sistem: 'Sistem / Backup',
};

export const LogView: React.FC<LogViewProps> = ({
  logs,
  trips,
  employees,
  departments,
  isAdmin,
  currentUsername,
  onToggleSidebar,
  onClearLogs,
}) => {
  const [subTab, setSubTab] = useState<LogSubTab>('workload');

  // --- Rekap Beban Tugas State ---
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workloadSearch, setWorkloadSearch] = useState('');
  const [workloadBidang, setWorkloadBidang] = useState('ALL');
  const [workloadAsn, setWorkloadAsn] = useState('ALL');
  const [workloadSort, setWorkloadSort] = useState<WorkloadSort>('days-desc');

  // --- Activity Log State ---
  const [logSearch, setLogSearch] = useState('');
  const [logCategory, setLogCategory] = useState<'ALL' | ActivityLogCategory>('ALL');
  const [logAction, setLogAction] = useState<string>('ALL');

  const deptsMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Compute workload per employee for chosen period
  const workloadRows = useMemo(() => {
    const tripCountByEmp = new Map<string, Set<string>>();
    const dutyDaysByEmp = new Map<string, number>();

    for (const trip of trips) {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      for (const dateKey of dates) {
        const [y, m] = dateKey.split('-').map(Number);
        const matchesPeriod =
          periodMode === 'all' ||
          (periodMode === 'year' && y === currentYear) ||
          (periodMode === 'month' && y === currentYear && m === currentMonth + 1);

        if (!matchesPeriod) continue;

        for (const empId of trip.karyawanIds) {
          if (!tripCountByEmp.has(empId)) {
            tripCountByEmp.set(empId, new Set());
          }
          tripCountByEmp.get(empId)!.add(trip.id);
          dutyDaysByEmp.set(empId, (dutyDaysByEmp.get(empId) || 0) + 1);
        }
      }
    }

    return employees.map((emp) => {
      const dept = deptsMap.get(emp.bidangId);
      const totalDays = dutyDaysByEmp.get(emp.id) || 0;
      const totalTrips = tripCountByEmp.get(emp.id)?.size || 0;
      return {
        employee: emp,
        department: dept,
        totalDays,
        totalTrips,
      };
    });
  }, [trips, employees, deptsMap, periodMode, currentYear, currentMonth]);

  const filteredWorkloadRows = useMemo(() => {
    return workloadRows
      .filter(({ employee, department }) => {
        if (workloadBidang !== 'ALL' && employee.bidangId !== workloadBidang) return false;
        if (workloadAsn !== 'ALL' && (employee.statusAsn || 'PNS') !== workloadAsn) return false;
        if (workloadSearch.trim()) {
          const q = workloadSearch.toLowerCase();
          const matchName = employee.nama.toLowerCase().includes(q);
          const matchNip = employee.nip.toLowerCase().includes(q);
          const matchJabatan = employee.jabatan.toLowerCase().includes(q);
          const matchDept =
            department?.nama.toLowerCase().includes(q) ||
            department?.inisial.toLowerCase().includes(q);
          if (!matchName && !matchNip && !matchJabatan && !matchDept) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (workloadSort === 'days-desc') {
          if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays;
          if (b.totalTrips !== a.totalTrips) return b.totalTrips - a.totalTrips;
          return a.employee.nama.localeCompare(b.employee.nama, 'id', { sensitivity: 'base' });
        }
        if (workloadSort === 'trips-desc') {
          if (b.totalTrips !== a.totalTrips) return b.totalTrips - a.totalTrips;
          if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays;
          return a.employee.nama.localeCompare(b.employee.nama, 'id', { sensitivity: 'base' });
        }
        return a.employee.nama.localeCompare(b.employee.nama, 'id', { sensitivity: 'base' });
      });
  }, [workloadRows, workloadBidang, workloadAsn, workloadSearch, workloadSort]);

  const workloadKpi = useMemo(() => {
    let totalDaysAll = 0;
    let activeEmployees = 0;
    let maxDays = 0;
    let maxEmpName = '-';

    for (const row of workloadRows) {
      totalDaysAll += row.totalDays;
      if (row.totalDays > 0) activeEmployees++;
      if (row.totalDays > maxDays) {
        maxDays = row.totalDays;
        maxEmpName = row.employee.nama;
      }
    }

    const avgDays =
      employees.length > 0 ? (totalDaysAll / employees.length).toFixed(1) : '0.0';

    return {
      totalDaysAll,
      activeEmployees,
      maxDays,
      maxEmpName,
      avgDays,
    };
  }, [workloadRows, employees.length]);

  // Scoped activity logs (Admin sees all; Operator sees only their own activities)
  const visibleLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (!isAdmin && entry.actorUsername !== currentUsername) {
        return false;
      }
      if (logCategory !== 'ALL' && entry.category !== logCategory) return false;
      if (logAction !== 'ALL' && entry.action !== logAction) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const haystack = [
          entry.title,
          entry.details || '',
          entry.actorUsername,
          entry.actorDisplayName,
          entry.bidangNama || '',
          entry.bidangInisial || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, isAdmin, currentUsername, logCategory, logAction, logSearch]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (subTab === 'workload') {
      const periodLabel =
        periodMode === 'month'
          ? `${NAMA_BULAN[currentMonth]} ${currentYear}`
          : periodMode === 'year'
          ? `Tahun ${currentYear}`
          : 'Semua Periode';

      const rowsData = filteredWorkloadRows.map((row, idx) => ({
        No: idx + 1,
        Nama: row.employee.nama,
        NIP: row.employee.nip,
        'Pangkat/Gol': row.employee.pangkatGol || '-',
        Jabatan: row.employee.jabatan,
        Bidang: row.department ? `[${row.department.inisial}] ${row.department.nama}` : '-',
        Status: row.employee.statusAsn || 'PNS',
        'Jumlah SPPD': row.totalTrips,
        'Total Hari Dinas': row.totalDays,
      }));

      const ws = XLSX.utils.json_to_sheet(rowsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Beban Tugas');
      XLSX.writeFile(wb, `Rekap_Beban_Tugas_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
    } else {
      const rowsData = visibleLogs.map((entry, idx) => ({
        No: idx + 1,
        Waktu: new Date(entry.timestamp).toLocaleString('id-ID'),
        Pengguna: `${entry.actorDisplayName} (${entry.actorUsername})`,
        Peran: entry.actorRole === 'admin' ? 'Administrator' : `Operator ${entry.bidangInisial || ''}`,
        Kategori: CATEGORY_LABELS[entry.category] || entry.category,
        Aksi: entry.action,
        Aktivitas: entry.title,
        Rincian: entry.details || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(rowsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Log Aktivitas');
      XLSX.writeFile(wb, `Log_Aktivitas_SPPD_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Unified Sticky Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Toggle + Icon + Title + Sub-Tab Switcher */}
            <div className="flex items-center justify-between sm:justify-start gap-3.5 flex-wrap">
              <div className="flex items-center gap-2.5">
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

                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Log Aktivitas &amp; Beban Tugas
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Riwayat perubahan data SPPD dan rekap beban hari dinas pegawai
                  </p>
                </div>
              </div>

              {/* Segmented Sub-Tab Switcher inside Header */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSubTab('workload')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    subTab === 'workload'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Rekap Beban Tugas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('activity')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    subTab === 'activity'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Riwayat Aktivitas ({visibleLogs.length})</span>
                </button>
              </div>
            </div>

            {/* Right: Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {subTab === 'workload' ? 'Ekspor Rekap Excel' : 'Ekspor Log Excel'}
                  </span>
                </button>
              )}

              {isAdmin && subTab === 'activity' && logs.length > 0 && onClearLogs && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Yakin ingin menghapus seluruh riwayat log aktivitas?')) {
                      onClearLogs();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Log</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {subTab === 'workload' ? (
          <>
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Total Hari-Pegawai
                  </span>
                  <CalendarIcon className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                  {workloadKpi.totalDaysAll}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Akumulasi hari perjalanan dinas
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Pegawai Pernah Bertugas
                  </span>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                  {workloadKpi.activeEmployees}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {employees.length}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Rata-rata {workloadKpi.avgDays} hari/pegawai
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                    Beban Tertinggi
                  </span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1 tabular-nums">
                  {workloadKpi.maxDays} Hari
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={workloadKpi.maxEmpName}>
                  {workloadKpi.maxEmpName}
                </div>
              </div>
            </div>

            {/* Filter & Period Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Period Switch */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  {(['month', 'year', 'all'] as PeriodMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPeriodMode(mode)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        periodMode === mode
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mode === 'month' ? 'Per Bulan' : mode === 'year' ? 'Per Tahun' : 'Semua Waktu'}
                    </button>
                  ))}
                </div>

                {/* Month / Year Navigator */}
                {periodMode !== 'all' && (
                  <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDate((prev) =>
                          periodMode === 'month'
                            ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                            : new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 min-w-28 text-center">
                      {periodMode === 'month'
                        ? `${NAMA_BULAN[currentMonth]} ${currentYear}`
                        : `Tahun ${currentYear}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDate((prev) =>
                          periodMode === 'month'
                            ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                            : new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Search & Filters */}
              <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
                <div className="relative min-w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={workloadSearch}
                    onChange={(e) => setWorkloadSearch(e.target.value)}
                    placeholder="Cari nama, NIP, jabatan..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={workloadBidang}
                    onChange={(e) => setWorkloadBidang(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-2.5 text-slate-700 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Bidang</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        [{d.inisial}] {d.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={workloadAsn}
                  onChange={(e) => setWorkloadAsn(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-2.5 text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="PPPK PW">PPPK PW</option>
                  <option value="Non ASN/Lainnya">Non ASN/Lainnya</option>
                </select>

                <select
                  value={workloadSort}
                  onChange={(e) => setWorkloadSort(e.target.value as WorkloadSort)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-2.5 text-slate-700 dark:text-slate-200 font-medium"
                >
                  <option value="days-desc">Urut: Hari Terbanyak</option>
                  <option value="trips-desc">Urut: SPPD Terbanyak</option>
                  <option value="name-asc">Urut: Nama A–Z</option>
                </select>
              </div>
            </div>

            {/* Workload Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                      <th className="py-3 px-3 text-center w-12">No</th>
                      <th className="py-3 px-3 min-w-56">Nama Pegawai &amp; Jabatan</th>
                      <th className="py-3 px-3 min-w-28">Bidang</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Jumlah SPPD</th>
                      <th className="py-3 px-3 text-right">Total Hari Dinas</th>
                      <th className="py-3 px-3 min-w-44">Proporsi Beban</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWorkloadRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Tidak ada data pegawai yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredWorkloadRows.map((row, idx) => {
                        const { employee, department, totalDays, totalTrips } = row;
                        const maxBase = Math.max(1, workloadKpi.maxDays);
                        const pct = totalDays > 0 ? Math.min(100, Math.round((totalDays / maxBase) * 100)) : 0;

                        return (
                          <tr
                            key={employee.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {employee.nama}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                                {employee.pangkatGol && (
                                  <span className="font-medium text-indigo-700 dark:text-indigo-300">
                                    {employee.pangkatGol} ·
                                  </span>
                                )}
                                <span className="font-mono text-[10px]">NIP. {employee.nip}</span>
                                <span>· {employee.jabatan}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {department ? (
                                <span
                                  style={getDeptBadgeStyle(department)}
                                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs ${department.color.badgeBg}`}
                                  title={department.nama}
                                >
                                  {department.inisial}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${getAsnBadgeClass(
                                  employee.statusAsn || 'PNS'
                                )}`}
                              >
                                {employee.statusAsn || 'PNS'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              {totalTrips} kali
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                              {totalDays} hari
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      totalDays > 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-9 text-right tabular-nums">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Activity Log Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-64 flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari aktivitas, pelaku, nomor surat, atau bidang..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={logCategory}
                    onChange={(e) =>
                      setLogCategory(e.target.value as 'ALL' | ActivityLogCategory)
                    }
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-2.5 text-slate-700 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <option value="sppd">SPPD / Perjalanan</option>
                    <option value="pegawai">Pegawai</option>
                    <option value="bidang">Bidang</option>
                    <option value="operator">Operator</option>
                    <option value="libur">Tanggal Merah</option>
                    <option value="sistem">Sistem / Backup</option>
                    <option value="auth">Autentikasi</option>
                  </select>
                </div>

                <select
                  value={logAction}
                  onChange={(e) => setLogAction(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-2.5 text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">Semua Aksi</option>
                  <option value="Tambah">Tambah</option>
                  <option value="Ubah">Ubah</option>
                  <option value="Hapus">Hapus</option>
                  <option value="Impor">Impor</option>
                  <option value="Backup">Backup</option>
                  <option value="Restore">Restore</option>
                  <option value="Login">Login</option>
                  <option value="Logout">Logout</option>
                </select>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                      <th className="py-3 px-4 w-44">Waktu</th>
                      <th className="py-3 px-4 min-w-44">Pelaku / User</th>
                      <th className="py-3 px-3 w-28">Kategori</th>
                      <th className="py-3 px-3 w-24">Aksi</th>
                      <th className="py-3 px-4 min-w-64">Aktivitas &amp; Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Belum ada riwayat aktivitas yang tercatat.
                        </td>
                      </tr>
                    ) : (
                      visibleLogs.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {entry.actorDisplayName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {entry.actorUsername} ·{' '}
                              {entry.actorRole === 'admin'
                                ? 'Administrator'
                                : entry.bidangInisial || 'Operator Bidang'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {CATEGORY_LABELS[entry.category] || entry.category}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                entry.action === 'Hapus'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : entry.action === 'Tambah' || entry.action === 'Impor' || entry.action === 'Backup'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : entry.action === 'Ubah' || entry.action === 'Restore'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {entry.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {entry.title}
                            </div>
                            {entry.details && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {entry.details}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
