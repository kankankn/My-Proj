import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Plus,
  ShieldCheck,
  ArrowDownAZ,
  ArrowUpAZ,
  Building2
} from 'lucide-react';
import { BusinessTrip, Department, Employee } from '../../types/trip';
import { 
  getDatesBetween, 
  formatDateKey, 
  formatIndonesianDate, 
  formatDateRange 
} from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface QuickAvailabilityCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  onQuickAssign: (employeeId: string, date: string) => void;
  onSelectTrip: (trip: BusinessTrip) => void;
}

export const QuickAvailabilityCheckerModal: React.FC<QuickAvailabilityCheckerModalProps> = ({
  isOpen,
  onClose,
  trips,
  departments,
  employees,
  onQuickAssign,
  onSelectTrip,
}) => {
  const [activeTab, setActiveTab] = useState<'byDate' | 'byEmployee'>('byDate');
  const [targetDate, setTargetDate] = useState(formatDateKey(new Date()));
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [selectedAsnFilter, setSelectedAsnFilter] = useState('ALL');
  const [sortAvailableBy, setSortAvailableBy] = useState<'name-asc' | 'name-desc' | 'bidang-asc'>('name-asc');
  const [tab2SortBy, setTab2SortBy] = useState<'name-asc' | 'bidang-asc'>('name-asc');
  const [tab2SearchQuery, setTab2SearchQuery] = useState('');

  const deptsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  const empsMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // BY DATE LOGIC
  const activeTripsOnDate = useMemo(() => {
    return trips.filter(trip => {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      return dates.includes(targetDate);
    });
  }, [trips, targetDate]);

  const { busyEmployees, availableEmployees } = useMemo(() => {
    const busyEmployeesMap = new Map<string, BusinessTrip>();
    for (const trip of activeTripsOnDate) {
      for (const eid of trip.karyawanIds) {
        busyEmployeesMap.set(eid, trip);
      }
    }

    const busy: { emp: Employee; trip: BusinessTrip }[] = [];
    const avail: Employee[] = [];

    for (const emp of employees) {
      if (busyEmployeesMap.has(emp.id)) {
        busy.push({ emp, trip: busyEmployeesMap.get(emp.id)! });
      } else {
        avail.push(emp);
      }
    }

    return { busyEmployees: busy, availableEmployees: avail };
  }, [activeTripsOnDate, employees]);

  // Filtered and Sorted available employees
  const filteredAvailable = useMemo(() => {
    let list = availableEmployees.filter(emp => {
      if (selectedAsnFilter !== 'ALL' && (emp.statusAsn || 'PNS') !== selectedAsnFilter) {
        return false;
      }
      return (
        emp.nama.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
        emp.nip.includes(searchEmployeeQuery) ||
        emp.jabatan.toLowerCase().includes(searchEmployeeQuery.toLowerCase())
      );
    });

    list = [...list].sort((a, b) => {
      if (sortAvailableBy === 'name-asc') {
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      if (sortAvailableBy === 'name-desc') {
        return b.nama.localeCompare(a.nama, 'id', { sensitivity: 'base' });
      }
      if (sortAvailableBy === 'bidang-asc') {
        const deptA = deptsMap.get(a.bidangId)?.inisial || '';
        const deptB = deptsMap.get(b.bidangId)?.inisial || '';
        const comp = deptA.localeCompare(deptB, 'id', { sensitivity: 'base' });
        if (comp !== 0) return comp;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      return 0;
    });

    return list;
  }, [availableEmployees, searchEmployeeQuery, selectedAsnFilter, sortAvailableBy, deptsMap]);

  // Tab 2: Filtered and Sorted employees for search and dropdown
  const tab2Employees = useMemo(() => {
    let list = [...employees];
    if (tab2SearchQuery.trim()) {
      const q = tab2SearchQuery.toLowerCase();
      list = list.filter(emp => {
        const dept = deptsMap.get(emp.bidangId);
        return (
          emp.nama.toLowerCase().includes(q) ||
          emp.nip.includes(q) ||
          emp.jabatan.toLowerCase().includes(q) ||
          (emp.statusAsn && emp.statusAsn.toLowerCase().includes(q)) ||
          (dept && (dept.nama.toLowerCase().includes(q) || dept.inisial.toLowerCase().includes(q)))
        );
      });
    }

    return list.sort((a, b) => {
      if (tab2SortBy === 'bidang-asc') {
        const deptA = deptsMap.get(a.bidangId)?.inisial || '';
        const deptB = deptsMap.get(b.bidangId)?.inisial || '';
        const comp = deptA.localeCompare(deptB, 'id', { sensitivity: 'base' });
        if (comp !== 0) return comp;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
    });
  }, [employees, tab2SearchQuery, tab2SortBy, deptsMap]);

  // BY EMPLOYEE LOGIC
  const employeeSelectedTrips = useMemo(() => {
    return trips.filter(trip =>
      trip.karyawanIds.includes(selectedEmpId)
    ).sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
  }, [trips, selectedEmpId]);

  const targetEmployee = empsMap.get(selectedEmpId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pusat Pengecekan Jadwal & Anti-Bentrok
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Validasi ketersediaan pegawai dan cegah jadwal ganda dalam 1 hari
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 p-1">
          <button
            onClick={() => setActiveTab('byDate')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'byDate'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🗓️ Cek Berdasarkan Tanggal
          </button>
          <button
            onClick={() => setActiveTab('byEmployee')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'byEmployee'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            👤 Cek Berdasarkan Nama Pegawai
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          
          {/* TAB 1: BY DATE */}
          {activeTab === 'byDate' && (
            <div className="space-y-4">
              {/* Date Input */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    Pilih Tanggal yang Ingin Dicek:
                  </label>
                  <p className="text-xs text-indigo-700">
                    Melihat siapa yang sudah dinas dan siapa yang bebas tugas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-900 bg-white px-2 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
                    {formatIndonesianDate(targetDate)}
                  </span>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={() => setTargetDate(formatDateKey(new Date()))}
                    className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 cursor-pointer"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-1">
                <span>
                  Hasil Pemeriksaan Tanggal: {formatIndonesianDate(targetDate, true)}
                </span>
                <span className="text-[11px] text-slate-700">
                  {busyEmployees.length} Dinas • {availableEmployees.length} Siap Tugas
                </span>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Pegawai Sedang Bertugas (BENTROK JIKA DITUGASKAN LAGI) */}
                <div className="border border-rose-200 rounded-xl p-3.5 bg-rose-50/40">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-rose-200">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Sedang Dinas ({busyEmployees.length})</span>
                    </span>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Tidak Dapat Ditugaskan Lagi
                    </span>
                  </div>

                  {busyEmployees.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-700 italic">
                      Tidak ada pegawai yang sedang bertugas di tanggal ini.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {busyEmployees.map(({ emp, trip }) => {
                        const dept = deptsMap.get(trip.bidangId);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              onClose();
                              onSelectTrip(trip);
                            }}
                            className="p-2.5 bg-white border border-rose-200 rounded-lg text-xs hover:border-rose-400 hover:shadow-xs transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-slate-900 truncate">{emp.nama}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${getAsnBadgeClass(emp.statusAsn)}`}>
                                  {emp.statusAsn || 'PNS'}
                                </span>
                              </div>
                              <span
                                style={getDeptBadgeStyle(dept)}
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                  dept?.color?.badgeBg || 'bg-slate-700 text-white'
                                }`}
                              >
                                {dept?.inisial}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 line-clamp-1">
                              Kegiatan: {trip.namaKegiatan}
                            </p>
                            <p className="text-[10px] text-slate-700 mt-1 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-slate-600" />
                              <span>{trip.tujuan}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Pegawai Tersedia / Standby */}
                <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-emerald-200">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Tersedia & Bebas Tugas ({availableEmployees.length})</span>
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Aman Ditugaskan
                      </span>
                    </div>

                    <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchEmployeeQuery}
                          onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                          placeholder="Cari nama pegawai..."
                          className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-emerald-200 rounded-md text-slate-800 placeholder-slate-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <select
                          value={selectedAsnFilter}
                          onChange={(e) => setSelectedAsnFilter(e.target.value)}
                          className="w-full py-1 px-2 text-xs bg-white border border-emerald-200 rounded-md text-slate-700 font-medium focus:outline-hidden"
                        >
                          <option value="ALL">Semua Status Pegawai</option>
                          <option value="PNS">Status: PNS</option>
                          <option value="PPPK">Status: PPPK</option>
                          <option value="PPPK PW">Status: PPPK PW</option>
                          <option value="Non ASN/Lainnya">Status: Non ASN/Lainnya</option>
                        </select>
                      </div>
                    </div>

                    {/* Sorting controls for available employees */}
                    <div className="flex items-center justify-between mb-2 px-0.5 text-[10px] text-slate-600">
                      <span>Urutkan:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSortAvailableBy('name-asc')}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-pointer ${
                            sortAvailableBy === 'name-asc'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-emerald-200'
                          }`}
                          title="Urutkan A-Z"
                        >
                          <ArrowDownAZ className="w-3 h-3" />
                          <span>A-Z</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortAvailableBy('name-desc')}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-pointer ${
                            sortAvailableBy === 'name-desc'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-emerald-200'
                          }`}
                          title="Urutkan Z-A"
                        >
                          <ArrowUpAZ className="w-3 h-3" />
                          <span>Z-A</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortAvailableBy('bidang-asc')}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-pointer ${
                            sortAvailableBy === 'bidang-asc'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-emerald-200'
                          }`}
                          title="Urutkan Bidang"
                        >
                          <Building2 className="w-3 h-3" />
                          <span>Bidang</span>
                        </button>
                      </div>
                    </div>

                    {filteredAvailable.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-700 italic">
                        Tidak ada pegawai yang cocok dengan filter.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {filteredAvailable.map((emp) => (
                          <div
                            key={emp.id}
                            className="p-2 bg-white border border-emerald-200 rounded-lg text-xs flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                <p className="font-semibold text-slate-900 truncate">{emp.nama}</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs shrink-0 ${getAsnBadgeClass(emp.statusAsn)}`}>
                                  {emp.statusAsn || 'PNS'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-700 truncate">{emp.jabatan}</p>
                            </div>
                            <button
                              onClick={() => {
                                onClose();
                                onQuickAssign(emp.id, targetDate);
                              }}
                              className="shrink-0 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                              title="Tugaskan pada tanggal ini"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tugaskan</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: BY EMPLOYEE */}
          {activeTab === 'byEmployee' && (
            <div className="space-y-4">
              {/* Select Employee */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                    Cari & Pilih Pegawai untuk Cek Jadwal:
                  </label>
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Urutan:</span>
                    <button
                      type="button"
                      onClick={() => setTab2SortBy('name-asc')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                        tab2SortBy === 'name-asc'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-650'
                      }`}
                    >
                      Alfabet (A-Z)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab2SortBy('bidang-asc')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                        tab2SortBy === 'bidang-asc'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-650'
                      }`}
                    >
                      Bidang
                    </button>
                  </div>
                </div>

                {/* Search Bar Pegawai */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tab2SearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTab2SearchQuery(val);
                      if (val.trim()) {
                        const q = val.toLowerCase();
                        const match = employees.find(emp => {
                          const dept = deptsMap.get(emp.bidangId);
                          return (
                            emp.nama.toLowerCase().includes(q) ||
                            emp.nip.includes(q) ||
                            emp.jabatan.toLowerCase().includes(q) ||
                            (dept && dept.inisial.toLowerCase().includes(q))
                          );
                        });
                        if (match) {
                          setSelectedEmpId(match.id);
                        }
                      }
                    }}
                    placeholder="Ketik untuk mencari nama pegawai, NIP, atau jabatan..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  {tab2SearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTab2SearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Hapus pencarian"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Pegawai */}
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                >
                  {tab2Employees.length === 0 ? (
                    <option disabled value="">
                      Tidak ditemukan pegawai yang cocok dengan "{tab2SearchQuery}"
                    </option>
                  ) : (
                    tab2Employees.map((emp) => {
                      const dept = deptsMap.get(emp.bidangId);
                      return (
                        <option key={emp.id} value={emp.id}>
                          [{dept?.inisial || 'DINAS'}] {emp.nama} ({emp.statusAsn || 'PNS'}) - {emp.jabatan} (NIP. {emp.nip})
                        </option>
                      );
                    })
                  )}
                </select>

                {/* Quick Results Chips when Searching */}
                {tab2SearchQuery.trim() && tab2Employees.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                      Hasil pencarian ({tab2Employees.length} pegawai):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {tab2Employees.map((emp) => {
                        const isChosen = emp.id === selectedEmpId;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => setSelectedEmpId(emp.id)}
                            className={`px-2.5 py-1 text-xs rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-650 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            <span>{emp.nama}</span>
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${isChosen ? 'bg-indigo-500 text-white' : getAsnBadgeClass(emp.statusAsn)}`}>
                              {emp.statusAsn || 'PNS'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Employee Summary Card */}
              {targetEmployee && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {targetEmployee.nama.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{targetEmployee.nama}</h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs ${getAsnBadgeClass(targetEmployee.statusAsn)}`}>
                          {targetEmployee.statusAsn || 'PNS'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        {targetEmployee.jabatan} • NIP: {targetEmployee.nip}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-indigo-700">
                      {employeeSelectedTrips.length}
                    </span>
                    <p className="text-[10px] text-slate-700">Total Tugas</p>
                  </div>
                </div>
              )}

              {/* Trips History / Calendar List for this Employee */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Riwayat & Jadwal Perjalanan Dinas Pegawai
                </h4>

                {employeeSelectedTrips.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-700 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    Pegawai ini belum memiliki jadwal perjalanan dinas.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {employeeSelectedTrips.map((trip) => {
                      const dept = deptsMap.get(trip.bidangId);
                      return (
                        <div
                          key={trip.id}
                          onClick={() => {
                            onClose();
                            onSelectTrip(trip);
                          }}
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                style={getDeptBadgeStyle(dept)}
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  dept?.color?.badgeBg || 'bg-slate-700 text-white'
                                }`}
                              >
                                {dept?.inisial}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {trip.namaKegiatan}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-600" />
                              <span>{formatDateRange(trip.tanggalMulai, trip.tanggalSelesai)}</span>
                              <span className="mx-1">•</span>
                              <MapPin className="w-3 h-3 text-slate-600" />
                              <span>{trip.tujuan}</span>
                            </p>
                          </div>

                          <span className="text-xs text-indigo-700 font-semibold">
                            Lihat Detail →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
