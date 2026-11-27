import React, { useState, useMemo } from 'react';
import { 
  X, 
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
  AlertCircle
} from 'lucide-react';
import { BusinessTrip, Department, Employee } from '../../types/trip';
import { NAMA_BULAN, NAMA_HARI_PENDEK, getDatesBetween } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface EmployeeTripMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  initialDate?: Date;
  onSelectTrip: (trip: BusinessTrip) => void;
}

export const EmployeeTripMatrixModal: React.FC<EmployeeTripMatrixModalProps> = ({
  isOpen,
  onClose,
  trips,
  departments,
  employees,
  initialDate = new Date(),
  onSelectTrip,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBidangFilter, setSelectedBidangFilter] = useState('ALL');
  const [selectedAsnFilter, setSelectedAsnFilter] = useState('ALL');
  const [filterOnlyActive, setFilterOnlyActive] = useState(false); // default: all employees or active ones

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const deptsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  const empsMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

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

  // Total duty days per employee in this month
  const dutyDaysCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      const empMap = employeeDutyMap.get(emp.id);
      map.set(emp.id, empMap ? empMap.size : 0);
    }
    return map;
  }, [employees, employeeDutyMap]);

  // Active employees with trips in this month
  const activeEmployeeIdsThisMonth = useMemo(() => {
    const set = new Set<string>();
    for (const [empId, dateMap] of employeeDutyMap.entries()) {
      if (dateMap.size > 0) {
        set.add(empId);
      }
    }
    return set;
  }, [employeeDutyMap]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Filter active only
      if (filterOnlyActive && !activeEmployeeIdsThisMonth.has(emp.id)) {
        return false;
      }
      // Filter bidang
      if (selectedBidangFilter !== 'ALL' && emp.bidangId !== selectedBidangFilter) {
        return false;
      }
      // Filter Status ASN
      if (selectedAsnFilter !== 'ALL' && (emp.statusAsn || 'PNS') !== selectedAsnFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dept = deptsMap.get(emp.bidangId);
        const matchName = emp.nama.toLowerCase().includes(q);
        const matchNip = emp.nip.includes(q);
        const matchPangkat = emp.pangkatGol ? emp.pangkatGol.toLowerCase().includes(q) : false;
        const matchJabatan = emp.jabatan.toLowerCase().includes(q);
        const matchDept = dept ? dept.nama.toLowerCase().includes(q) || dept.inisial.toLowerCase().includes(q) : false;
        return matchName || matchNip || matchPangkat || matchJabatan || matchDept;
      }
      return true;
    }).sort((a, b) => {
      // Sort active first, then alphabetically
      const countA = dutyDaysCountMap.get(a.id) || 0;
      const countB = dutyDaysCountMap.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
    });
  }, [employees, filterOnlyActive, activeEmployeeIdsThisMonth, selectedBidangFilter, selectedAsnFilter, searchQuery, deptsMap, dutyDaysCountMap]);

  // Calendar days array for header
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(currentYear, currentMonth, dayNum);
      const dayOfWeek = (dateObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      const isWeekend = dayOfWeek >= 5; // Saturday (5), Sunday (6)
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayName = NAMA_HARI_PENDEK[dayOfWeek];

      return {
        dayNum,
        dayName,
        dateKey,
        isWeekend,
        isToday: dateKey === new Date().toISOString().split('T')[0],
      };
    });
  }, [currentYear, currentMonth, daysInMonth]);

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Matriks Perjalanan Dinas Pegawai (Tampilan Excel)
                </h3>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  Format Spreadsheet Baris & Kolom
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Baris berisi nama pegawai, kolom berisi tanggal bulan terpilih dengan penanda warna libur & keterangan dinas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Cetak matriks atau simpan sebagai dokumen PDF"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Month Navigator Bar */}
        <div className="px-5 py-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Pilih Periode:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-0.5 font-bold text-slate-900 dark:text-white min-w-32 text-center select-none">
                {NAMA_BULAN[currentMonth]} {currentYear}
              </div>

              <button
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className="ml-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md transition-colors cursor-pointer"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama / NIP pegawai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Bidang */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBidangFilter}
                onChange={(e) => setSelectedBidangFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">Semua Bidang ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.inisial}] {d.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status ASN */}
            <div className="flex items-center gap-1">
              <select
                value={selectedAsnFilter}
                onChange={(e) => setSelectedAsnFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
              >
                <option value="ALL">Semua Status Pegawai</option>
                <option value="PNS">Status: PNS</option>
                <option value="PPPK">Status: PPPK</option>
                <option value="PPPK PW">Status: PPPK PW</option>
                <option value="Non ASN/Lainnya">Status: Non ASN/Lainnya</option>
              </select>
            </div>

            {/* Toggle: Active Only vs All Employees */}
            <button
              onClick={() => setFilterOnlyActive(!filterOnlyActive)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                filterOnlyActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>
                {filterOnlyActive
                  ? `Hanya Yang Dinas (${activeEmployeeIdsThisMonth.size})`
                  : `Tampilkan Semua Pegawai (${employees.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Summary Info Banner */}
        <div className="px-5 py-2 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pegawai Bertugas: <strong className="text-slate-900 dark:text-white">{activeEmployeeIdsThisMonth.size} Orang</strong></span>
            </span>

            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CalendarIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Total Hari Dinas (Man-Days): <strong className="text-slate-900 dark:text-white">{totalDutyDaysSum} Hari</strong></span>
            </span>

            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Agenda SPPD Aktif: <strong className="text-slate-900 dark:text-white">{tripsThisMonthCount} Kegiatan</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 inline-block" />
              <span>Warna Libur (Sabtu & Minggu)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
              <span>Cell Sudah Melakukan Dinas</span>
            </span>
          </div>
        </div>

        {/* Printable Title (Print only) */}
        <div className="hidden print:block p-4 text-center border-b-2 border-slate-900">
          <h2 className="text-base font-bold uppercase tracking-wide">
            REKAPITULASI MATRIKS PERJALANAN DINAS PEGAWAI (EXCEL SPREADSHEET)
          </h2>
          <h3 className="text-xs font-semibold text-slate-700 uppercase">
            PERIODE: {NAMA_BULAN[currentMonth].toUpperCase()} {currentYear}
          </h3>
          <p className="text-[10px] text-slate-500">
            Sistem Informasi Manajemen Kalender SPPD (SIM-SPPD)
          </p>
        </div>

        {/* Excel Matrix Table Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100/50 dark:bg-slate-950/40">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[64vh]">
              <table className="w-full text-xs border-collapse text-left select-none">
                
                {/* Table Header: Sticky Columns & Date Columns */}
                <thead className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-800 shadow-xs">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    
                    {/* Fixed Column 1: No */}
                    <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-2.5 py-3 text-center w-10 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 shadow-2xs">
                      No
                    </th>

                    {/* Fixed Column 2: Nama Pegawai */}
                    <th className="sticky left-10 z-30 bg-slate-100 dark:bg-slate-800 px-3.5 py-3 min-w-56 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 shadow-2xs">
                      Nama Pegawai
                    </th>

                    {/* Fixed Column 3: NIP & Jabatan */}
                    <th className="px-3 py-3 min-w-48 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      NIP, Jabatan & Status
                    </th>

                    {/* Fixed Column 4: Bidang */}
                    <th className="px-3 py-3 min-w-28 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                      Bidang
                    </th>

                    {/* Date Columns: 1 to daysInMonth */}
                    {daysArray.map((day) => (
                      <th
                        key={day.dateKey}
                        className={`px-1.5 py-2 text-center min-w-[58px] border-r border-slate-200 dark:border-slate-700 ${
                          day.isWeekend
                            ? 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-b-2 border-b-rose-400 font-bold'
                            : day.isToday
                            ? 'bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-b-2 border-b-indigo-500 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold'
                        }`}
                      >
                        <div className="text-[11px] font-mono leading-none">
                          {String(day.dayNum).padStart(2, '0')}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider mt-1 opacity-80">
                          {day.dayName}
                        </div>
                        {day.isWeekend && (
                          <span className="block text-[8px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                            LIBUR
                          </span>
                        )}
                      </th>
                    ))}

                    {/* Total Hari Column */}
                    <th className="sticky right-0 z-30 bg-slate-100 dark:bg-slate-800 px-3 py-3 text-center min-w-28 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-700 shadow-2xs">
                      Total Dinas
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5 + daysArray.length}
                        className="p-12 text-center text-slate-400 dark:text-slate-500 italic"
                      >
                        Tidak ada data pegawai yang sesuai dengan pencarian atau filter aktif.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, idx) => {
                      const dept = deptsMap.get(emp.bidangId);
                      const totalDutyDays = dutyDaysCountMap.get(emp.id) || 0;
                      const empDateMap = employeeDutyMap.get(emp.id);

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Col 1: No (Sticky left) */}
                          <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 px-2.5 py-2.5 text-center text-slate-500 dark:text-slate-400 font-mono text-xs border-r border-slate-200 dark:border-slate-700 shadow-2xs">
                            {idx + 1}
                          </td>

                          {/* Col 2: Nama Pegawai (Sticky left) */}
                          <td className="sticky left-10 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 px-3.5 py-2.5 border-r border-slate-200 dark:border-slate-700 shadow-2xs">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {emp.nama.slice(0, 1)}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {emp.nama}
                              </span>
                            </div>
                          </td>

                          {/* Col 3: NIP, Jabatan & Status ASN */}
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {emp.pangkatGol && (
                                <span className="font-semibold text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                                  {emp.pangkatGol}
                                </span>
                              )}
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {emp.nip || 'Non-NIP'}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${getAsnBadgeClass(emp.statusAsn)}`}>
                                {emp.statusAsn || 'PNS'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                              {emp.jabatan}
                            </p>
                          </td>

                          {/* Col 4: Bidang Asal */}
                          <td className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-700">
                            <span
                              style={getDeptBadgeStyle(dept)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs tracking-wider inline-block ${
                                dept?.color?.badgeBg || 'bg-slate-700 text-white'
                              }`}
                            >
                              [{dept?.inisial || 'DINAS'}]
                            </span>
                          </td>

                          {/* Date Columns: 1 to daysInMonth */}
                          {daysArray.map((day) => {
                            const trip = empDateMap?.get(day.dateKey);
                            const tripDept = trip ? deptsMap.get(trip.bidangId) : undefined;

                            if (trip) {
                              return (
                                <td
                                  key={day.dateKey}
                                  onClick={() => onSelectTrip(trip)}
                                  className="p-1 text-center border-r border-slate-200 dark:border-slate-700 cursor-pointer bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                  title={`SPPD: ${trip.namaKegiatan}\nTujuan: ${trip.tujuan}\nSurat: ${trip.nomorSurat}\nBidang: [${tripDept?.inisial || 'DINAS'}] ${tripDept?.nama || ''}\n(Klik untuk lihat rincian lengkap)`}
                                >
                                  <div
                                    style={getDeptBadgeStyle(tripDept)}
                                    className={`px-1.5 py-1 rounded text-[10px] font-bold shadow-2xs leading-tight transition-transform hover:scale-105 ${
                                      tripDept?.color?.badgeBg || 'bg-indigo-600 text-white'
                                    }`}
                                  >
                                    <div className="truncate font-mono">
                                      [{tripDept?.inisial || 'DINAS'}]
                                    </div>
                                    <div className="text-[9px] font-medium opacity-90 truncate mt-0.5">
                                      Dinas
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            // Empty / No duty on this date
                            return (
                              <td
                                key={day.dateKey}
                                className={`p-1 text-center border-r border-slate-200 dark:border-slate-700 ${
                                  day.isWeekend
                                    ? 'bg-rose-50/40 dark:bg-rose-950/20 text-rose-300 dark:text-rose-800'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              >
                                <span className="text-[10px] select-none">-</span>
                              </td>
                            );
                          })}

                          {/* Col End: Total Hari Dinas (Sticky right) */}
                          <td className="sticky right-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 px-3 py-2.5 text-center border-l border-slate-200 dark:border-slate-700 shadow-2xs">
                            {totalDutyDays > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                {totalDutyDays} Hari
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600 text-[11px]">
                                0 Hari
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan <strong>{filteredEmployees.length}</strong> pegawai • Periode{' '}
              <strong>
                {NAMA_BULAN[currentMonth]} {currentYear}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
