import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  Users, 
  Building2, 
  Car, 
  FileText, 
  ShieldCheck, 
  AlertOctagon,
  Search,
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  CalendarOff
} from 'lucide-react';
import { BusinessTrip, Department, Employee, ConflictRecord, HolidayEntry } from '../../types/trip';
import { 
  checkTripConflicts, 
  formatIndonesianDate, 
  getDatesBetween, 
  formatDateKey 
} from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface TripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripData: Omit<BusinessTrip, 'id' | 'createdAt'>, existingId?: string) => void;
  initialDate?: string;
  tripToEdit?: BusinessTrip | null;
  departments: Department[];
  employees: Employee[];
  allTrips: BusinessTrip[];
  holidays?: HolidayEntry[];
  lockedBidangId?: string;
}

export const TripFormModal: React.FC<TripFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  tripToEdit,
  departments,
  employees,
  allTrips,
  holidays = [],
  lockedBidangId,
}) => {
  const defaultDate = initialDate || formatDateKey(new Date());

  const [nomorSurat, setNomorSurat] = useState('');
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [bidangId, setBidangId] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(defaultDate);
  const [tanggalSelesai, setTanggalSelesai] = useState(defaultDate);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [transportasi, setTransportasi] = useState('Kendaraan Dinas');
  const [keterangan, setKeterangan] = useState('');
  const [biayaAnggaran, setBiayaAnggaran] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSortBy, setEmployeeSortBy] = useState<'name-asc' | 'name-desc' | 'bidang-asc' | 'available-first'>('name-asc');
  const [employeeFilterDept, setEmployeeFilterDept] = useState<string>('ALL');
  const [employeeFilterAsn, setEmployeeFilterAsn] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when editing or opening with initialDate
  useEffect(() => {
    if (tripToEdit) {
      setNomorSurat(tripToEdit.nomorSurat);
      setNamaKegiatan(tripToEdit.namaKegiatan);
      setBidangId(lockedBidangId || tripToEdit.bidangId);
      setTujuan(tripToEdit.tujuan);
      setTanggalMulai(tripToEdit.tanggalMulai);
      setTanggalSelesai(tripToEdit.tanggalSelesai);
      setSelectedEmpIds(tripToEdit.karyawanIds);
      setTransportasi(tripToEdit.transportasi || 'Kendaraan Dinas');
      setKeterangan(tripToEdit.keterangan || '');
      setBiayaAnggaran(tripToEdit.biayaAnggaran || '');
      setErrorMessage(null);
    } else {
      const todayStr = initialDate || formatDateKey(new Date());
      setNomorSurat('');
      setNamaKegiatan('');
      setBidangId(lockedBidangId || departments[0]?.id || '');
      setTujuan('');
      setTanggalMulai(todayStr);
      setTanggalSelesai(todayStr);
      setSelectedEmpIds([]);
      setTransportasi('Kendaraan Dinas');
      setKeterangan('');
      // Auto-populate Pembebanan Anggaran with year of execution date
      const initialYear = todayStr.split('-')[0] || String(new Date().getFullYear());
      setBiayaAnggaran(initialYear);
      setErrorMessage(null);
    }
  }, [tripToEdit, initialDate, departments, isOpen, lockedBidangId]);

  // When start date changes, ensure end date >= start date
  const handleStartDateChange = (newStart: string) => {
    setTanggalMulai(newStart);
    if (newStart > tanggalSelesai) {
      setTanggalSelesai(newStart);
    }
    // Auto-update budget year if empty or matching a 4-digit year, while still allowing customization
    const newYear = newStart.split('-')[0];
    if (newYear && (!biayaAnggaran || /^\d{4}$/.test(biayaAnggaran.trim()))) {
      setBiayaAnggaran(newYear);
    }
  };

  // Live conflict evaluation in O(T*D + E) instead of O(E*T*D)
  const conflictsPerEmployee = useMemo(() => {
    const map = new Map<string, ConflictRecord[]>();
    if (!tanggalMulai || !tanggalSelesai) return map;

    const requestedSet = new Set(getDatesBetween(tanggalMulai, tanggalSelesai));
    const empsMap = new Map(employees.map(e => [e.id, e]));
    const deptsMap = new Map(departments.map(d => [d.id, d]));

    for (const trip of allTrips) {
      if (tripToEdit?.id && trip.id === tripToEdit.id) continue;
      const tripDates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      const overlappingDates = tripDates.filter(d => requestedSet.has(d));
      if (overlappingDates.length === 0) continue;

      const dept = deptsMap.get(trip.bidangId);
      const inisial = dept ? dept.inisial : 'DINAS';

      for (const empId of trip.karyawanIds) {
        const empName = empsMap.get(empId)?.nama || 'Pegawai';
        const list = map.get(empId) || [];
        for (const d of overlappingDates) {
          list.push({
            employeeId: empId,
            employeeName: empName,
            conflictingDate: d,
            conflictingTripId: trip.id,
            conflictingTripName: trip.namaKegiatan,
            conflictingTripBidangInisial: inisial,
          });
        }
        map.set(empId, list);
      }
    }
    return map;
  }, [tanggalMulai, tanggalSelesai, employees, allTrips, departments, tripToEdit]);

  const overlappingHolidays = useMemo(() => {
    if (!tanggalMulai || !tanggalSelesai || holidays.length === 0) return [];
    const requestedSet = new Set(getDatesBetween(tanggalMulai, tanggalSelesai));
    return holidays
      .filter((h) => requestedSet.has(h.tanggal))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [tanggalMulai, tanggalSelesai, holidays]);

  // List of active conflicts specifically among the currently selected employees
  const activeSelectedConflicts = useMemo(() => {
    return checkTripConflicts(
      selectedEmpIds,
      tanggalMulai,
      tanggalSelesai,
      allTrips,
      employees,
      departments,
      tripToEdit?.id
    );
  }, [selectedEmpIds, tanggalMulai, tanggalSelesai, allTrips, employees, departments, tripToEdit]);

  // Handle employee toggle
  const toggleEmployee = (empId: string) => {
    const isBusy = conflictsPerEmployee.has(empId);
    
    if (selectedEmpIds.includes(empId)) {
      setSelectedEmpIds(selectedEmpIds.filter(id => id !== empId));
      setErrorMessage(null);
    } else {
      if (isBusy) {
        const empConflict = conflictsPerEmployee.get(empId)?.[0];
        setErrorMessage(
          `⛔ Tidak dapat memilih ${empConflict?.employeeName}: Pegawai ini sudah dijadwalkan pada ${formatIndonesianDate(empConflict?.conflictingDate || '')} untuk kegiatan "${empConflict?.conflictingTripName}".`
        );
        return;
      }
      setSelectedEmpIds([...selectedEmpIds, empId]);
      setErrorMessage(null);
    }
  };


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaKegiatan.trim()) {
      setErrorMessage('Harap isi Nama Kegiatan / Keperluan Perjalanan Dinas.');
      return;
    }
    if (!bidangId) {
      setErrorMessage('Harap pilih Bidang yang Memberikan Perintah.');
      return;
    }
    if (!tujuan.trim()) {
      setErrorMessage('Harap isi Lokasi / Kota Tujuan.');
      return;
    }
    if (selectedEmpIds.length === 0) {
      setErrorMessage('Harap pilih minimal 1 (satu) pegawai yang ditugaskan.');
      return;
    }

    // STRICT CHECK: Double-booking validation rule
    if (activeSelectedConflicts.length > 0) {
      const first = activeSelectedConflicts[0];
      setErrorMessage(
        `⛔ VALIDASI BENTROK: ${first.employeeName} sudah memiliki jadwal dinas pada tanggal ${formatIndonesianDate(first.conflictingDate)} ("${first.conflictingTripName}"). Setiap orang tidak boleh melakukan 2 perjalanan dalam 1 hari.`
      );
      return;
    }

    onSave(
      {
        nomorSurat: nomorSurat.trim() || '-',
        namaKegiatan: namaKegiatan.trim(),
        bidangId: lockedBidangId || bidangId,
        tujuan: tujuan.trim(),
        tanggalMulai,
        tanggalSelesai,
        karyawanIds: selectedEmpIds,
        transportasi,
        keterangan: keterangan.trim(),
        biayaAnggaran: biayaAnggaran.trim(),
      },
      tripToEdit?.id
    );

    onClose();
  };

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      // Filter by Department
      if (employeeFilterDept !== 'ALL' && emp.bidangId !== employeeFilterDept) {
        return false;
      }
      // Filter by Status ASN
      if (employeeFilterAsn !== 'ALL' && (emp.statusAsn || 'PNS') !== employeeFilterAsn) {
        return false;
      }
      // Filter by Search
      if (employeeSearch.trim()) {
        const q = employeeSearch.toLowerCase();
        const dept = departments.find(d => d.id === emp.bidangId);
        const matchName = emp.nama.toLowerCase().includes(q);
        const matchJabatan = emp.jabatan.toLowerCase().includes(q);
        const matchNip = emp.nip.includes(q);
        const matchPangkat = emp.pangkatGol ? emp.pangkatGol.toLowerCase().includes(q) : false;
        const matchDept = dept ? (dept.inisial.toLowerCase().includes(q) || dept.nama.toLowerCase().includes(q)) : false;
        if (!matchName && !matchJabatan && !matchNip && !matchDept && !matchPangkat) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (employeeSortBy === 'name-asc') {
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      if (employeeSortBy === 'name-desc') {
        return b.nama.localeCompare(a.nama, 'id', { sensitivity: 'base' });
      }
      if (employeeSortBy === 'bidang-asc') {
        const deptA = departments.find(d => d.id === a.bidangId)?.inisial || '';
        const deptB = departments.find(d => d.id === b.bidangId)?.inisial || '';
        const compareDept = deptA.localeCompare(deptB, 'id', { sensitivity: 'base' });
        if (compareDept !== 0) return compareDept;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      if (employeeSortBy === 'available-first') {
        const hasConflictA = conflictsPerEmployee.has(a.id) ? 1 : 0;
        const hasConflictB = conflictsPerEmployee.has(b.id) ? 1 : 0;
        if (hasConflictA !== hasConflictB) return hasConflictA - hasConflictB;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      return 0;
    });

    return result;
  }, [employees, employeeFilterDept, employeeFilterAsn, employeeSearch, employeeSortBy, departments, conflictsPerEmployee]);

  if (!isOpen) return null;

  const selectedDepartment = departments.find(d => d.id === bidangId);
  const totalDays = getDatesBetween(tanggalMulai, tanggalSelesai).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {tripToEdit ? 'Ubah Perjalanan Dinas' : 'Tambah Perjalanan Dinas Baru'}
              </h3>
              <p className="text-xs text-slate-700">
                Pencatatan surat tugas dan pelaksana perjalanan dinas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Active Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-medium">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Conflict Notification Bar */}
          {activeSelectedConflicts.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Terdeteksi Bentrok Jadwal!</p>
                <p>
                  Terdapat pegawai terpilih yang sudah memiliki jadwal lain pada tanggal tersebut. 
                  Sistem melarang 2 kegiatan dinas pada hari yang sama untuk orang yang sama.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nomor Surat Tugas */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Surat Tugas / SPPD
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  placeholder="e.g. 090/ST-SEKR/2026/045"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Bidang Pemberi Perintah */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Bidang Pemberi Perintah</span>
                {lockedBidangId && (
                  <span className="text-[10px] font-semibold text-indigo-700">
                    Terkunci sesuai akses bidang
                  </span>
                )}
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  required
                  disabled={Boolean(lockedBidangId)}
                  value={lockedBidangId || bidangId}
                  onChange={(e) => {
                    if (!lockedBidangId) setBidangId(e.target.value);
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    lockedBidangId
                      ? 'bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed font-semibold'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      [{dept.inisial}] {dept.nama}
                    </option>
                  ))}
                </select>
              </div>
              {selectedDepartment && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span>Inisial pada kalender:</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${selectedDepartment.color.badgeBg}`}>
                    {selectedDepartment.inisial}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Nama Kegiatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kegiatan / Keperluan Tugas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              placeholder="Contoh: Rapat Koordinasi Penyusunan Anggaran Bappeda"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Lokasi / Kota Tujuan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kota / Tempat Tujuan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder="Contoh: Jakarta Pusat (Kementerian Keuangan RI)"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Tanggal Mulai & Tanggal Selesai */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>Waktu Pelaksanaan</span>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Durasi: {totalDays} Hari
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Berangkat / Mulai <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">({formatIndonesianDate(tanggalMulai)})</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggalMulai}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Kembali / Selesai <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">({formatIndonesianDate(tanggalSelesai)})</span>
                </label>
                <input
                  type="date"
                  required
                  min={tanggalMulai}
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                />
              </div>
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Format Tanggal: <strong className="font-mono text-slate-700 dark:text-slate-200">DD/MM/YYYY</strong></span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{formatIndonesianDate(tanggalMulai)} s/d {formatIndonesianDate(tanggalSelesai)}</span>
            </div>

            {overlappingHolidays.length > 0 && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <CalendarOff className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Catatan Tanggal Merah / Cuti Bersama:</span>{' '}
                  {overlappingHolidays
                    .map((h) => `${formatIndonesianDate(h.tanggal)} (${h.keterangan})`)
                    .join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Pilih Karyawan yang Berangkat (With Strict Conflict Warning) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Karyawan yang Berangkat ({selectedEmpIds.length} Dipilih){' '}
                <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="hidden sm:flex text-[11px] text-slate-700 items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Anti-Bentrok
                </span>
              </div>
            </div>

            {/* Quick search & Sorting bar */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Cari nama pegawai / NIP..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => setEmployeeSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter by Bidang */}
                <div className="flex items-center gap-1 shrink-0">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <select
                    value={employeeFilterDept}
                    onChange={(e) => setEmployeeFilterDept(e.target.value)}
                    className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">Semua Bidang</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        [{dept.inisial}] {dept.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Status ASN */}
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={employeeFilterAsn}
                    onChange={(e) => setEmployeeFilterAsn(e.target.value)}
                    className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">Semua Status Pegawai</option>
                    <option value="PNS">Status: PNS</option>
                    <option value="PPPK">Status: PPPK</option>
                    <option value="PPPK PW">Status: PPPK PW</option>
                    <option value="Non ASN/Lainnya">Status: Non ASN/Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Sorting Pills */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 px-0.5">
                <span className="font-semibold text-slate-700">Urutkan:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEmployeeSortBy('name-asc')}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      employeeSortBy === 'name-asc'
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Urutkan alfabet A ke Z"
                  >
                    <ArrowDownAZ className="w-3 h-3" />
                    <span>Alfabet A-Z</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmployeeSortBy('name-desc')}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      employeeSortBy === 'name-desc'
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Urutkan alfabet Z ke A"
                  >
                    <ArrowUpAZ className="w-3 h-3" />
                    <span>Alfabet Z-A</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmployeeSortBy('bidang-asc')}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      employeeSortBy === 'bidang-asc'
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Urutkan berdasarkan Bidang/Unit"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Bidang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmployeeSortBy('available-first')}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      employeeSortBy === 'available-first'
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Tampilkan yang bebas tugas di atas"
                  >
                    <span>Tersedia</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Employees List Cards */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
              {filteredEmployees.map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.id);
                const conflicts = conflictsPerEmployee.get(emp.id);
                const hasConflict = !!conflicts && conflicts.length > 0;
                const empDept = departments.find(d => d.id === emp.bidangId);

                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`px-3 py-2 flex items-start justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-indigo-50/70 hover:bg-indigo-100/50'
                        : hasConflict
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by div click
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900">{emp.nama}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${getAsnBadgeClass(emp.statusAsn)}`}>
                            {emp.statusAsn || 'PNS'}
                          </span>
                          {empDept && (
                            <span
                              style={getDeptBadgeStyle(empDept)}
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono shadow-2xs ${
                                empDept?.color?.badgeBg || 'bg-slate-700 text-white'
                              }`}
                            >
                              {empDept.inisial}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700">
                          {emp.pangkatGol && (
                            <span className="font-semibold text-indigo-700 dark:text-indigo-400 mr-1.5">
                              [{emp.pangkatGol}]
                            </span>
                          )}
                          {emp.jabatan} • NIP. {emp.nip}
                        </p>

                        {/* Conflict Banner for this employee */}
                        {hasConflict && (
                          <div className="mt-1 text-[11px] text-rose-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>
                              ⛔ Sudah dinas: &quot;{conflicts[0].conflictingTripName}&quot; ({formatIndonesianDate(conflicts[0].conflictingDate)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {hasConflict ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                          Bentrok
                        </span>
                      ) : isSelected ? (
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Ditugaskan
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Tersedia
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transportasi & Anggaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sarana Transportasi
              </label>
              <div className="relative">
                <Car className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={transportasi}
                  onChange={(e) => setTransportasi(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="Kendaraan Dinas">Kendaraan Dinas</option>
                  <option value="Kendaraan Pribadi">Kendaraan Pribadi</option>
                  <option value="Kapal Laut">Kapal Laut / Penyeberangan Ferry</option>
                  <option value="Kereta Api">Kereta Api (KAI)</option>
                  <option value="Kereta Cepat Whoosh">Kereta Cepat Whoosh</option>
                  <option value="Pesawat Udara">Pesawat Udara (Penerbangan Komersial)</option>
                  <option value="Mobil Travel / Sewa">Mobil Travel / Rental</option>
                  <option value="Transportasi Umum / Bus">Bus Antar Kota / Angkutan Umum</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pembebanan Anggaran
              </label>
              <input
                type="text"
                value={biayaAnggaran}
                onChange={(e) => setBiayaAnggaran(e.target.value)}
                placeholder="e.g. TA 2026"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Keterangan / Catatan Tambahan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Catatan Tugas
            </label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan agenda, perlengkapan yang perlu dibawa, atau kontak person di lokasi..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={activeSelectedConflicts.length > 0}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                activeSelectedConflicts.length > 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {tripToEdit ? 'Simpan Perubahan' : 'Jadwalkan Perjalanan Dinas'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
