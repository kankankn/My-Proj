import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Trash2, 
  Edit2, 
  Search, 
  UserPlus, 
  ArrowDownAZ, 
  ArrowUpAZ, 
  Building2, 
  Briefcase,
  Filter,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  X,
  BadgeCheck,
  Award,
  LayoutList,
  LayoutGrid,
  Menu
} from 'lucide-react';
import { Employee, Department, BusinessTrip, AsnStatus } from '../../types/trip';
import { exportEmployeesToExcel, downloadEmployeeTemplate } from '../../utils/excelEmployeeUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { ASN_STATUS_OPTIONS, getAsnBadgeClass } from '../../utils/asnUtils';
import { DAFTAR_PANGKAT_ASN } from '../../utils/asnPangkatUtils';
import { EmployeeImportModal } from '../Modals/EmployeeImportModal';

interface EmployeeViewProps {
  employees: Employee[];
  departments: Department[];
  allTrips: BusinessTrip[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onBulkImportEmployees?: (employees: Employee[]) => void;
  onToggleSidebar?: () => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'bidang-asc';

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  employees,
  departments,
  allTrips,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBulkImportEmployees,
  onToggleSidebar,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [filterBidangId, setFilterBidangId] = useState<string>('ALL');
  const [filterStatusAsn, setFilterStatusAsn] = useState<string>('ALL');
  const [groupByBidang, setGroupByBidang] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [pangkatGol, setPangkatGol] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [bidangId, setBidangId] = useState(departments[0]?.id || '');
  const [statusAsn, setStatusAsn] = useState<AsnStatus>('PNS');

  const deptsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  
  const tripCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const trip of allTrips) {
      for (const eid of trip.karyawanIds) {
        map.set(eid, (map.get(eid) || 0) + 1);
      }
    }
    return map;
  }, [allTrips]);

  const asnStats = useMemo(() => {
    let pns = 0;
    let pppk = 0;
    let pppkPw = 0;
    let nonAsn = 0;
    for (const emp of employees) {
      const s = emp.statusAsn || 'PNS';
      if (s === 'PNS') pns++;
      else if (s === 'PPPK') pppk++;
      else if (s === 'PPPK PW') pppkPw++;
      else if (s === 'Non ASN/Lainnya') nonAsn++;
    }
    return { pns, pppk, pppkPw, nonAsn, total: employees.length };
  }, [employees]);

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setNama('');
    setNip('');
    setPangkatGol('');
    setJabatan('');
    setBidangId(departments[0]?.id || '');
    setStatusAsn('PNS');
    setShowForm(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setNama(emp.nama);
    setNip(emp.nip);
    setPangkatGol(emp.pangkatGol || '');
    setJabatan(emp.jabatan);
    setBidangId(emp.bidangId);
    setStatusAsn(emp.statusAsn || 'PNS');
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isNipRequired = statusAsn !== 'Non ASN/Lainnya';
    if (!nama.trim() || (isNipRequired && !nip.trim()) || !jabatan.trim()) return;

    const finalNip = nip.trim() || '-';

    if (editingEmp) {
      onUpdateEmployee({
        ...editingEmp,
        nama: nama.trim(),
        nip: finalNip,
        pangkatGol: pangkatGol.trim() || undefined,
        jabatan: jabatan.trim(),
        bidangId,
        statusAsn,
      });
      setAlertSuccess(`Data pegawai "${nama.trim()}" berhasil diperbarui.`);
    } else {
      onAddEmployee({
        nama: nama.trim(),
        nip: finalNip,
        pangkatGol: pangkatGol.trim() || undefined,
        jabatan: jabatan.trim(),
        bidangId,
        statusAsn,
      });
      setAlertSuccess(`Pegawai baru "${nama.trim()}" berhasil ditambahkan.`);
    }

    setShowForm(false);
    setEditingEmp(null);
    setTimeout(() => setAlertSuccess(null), 4000);
  };

  const handleDelete = (emp: Employee) => {
    const activeTripsCount = tripCountMap.get(emp.id) || 0;
    const confirmText = activeTripsCount > 0
      ? `Pegawai "${emp.nama}" tercatat dalam ${activeTripsCount} perjalanan dinas. Yakin ingin menghapus? (Jadwal perjalanan tidak akan terhapus otomatis)`
      : `Yakin ingin menghapus pegawai "${emp.nama}"?`;

    if (window.confirm(confirmText)) {
      onDeleteEmployee(emp.id);
      setAlertSuccess(`Pegawai "${emp.nama}" berhasil dihapus.`);
      setTimeout(() => setAlertSuccess(null), 3000);
    }
  };

  // Filter and Sort employees
  const processedEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      // Filter by Bidang
      if (filterBidangId !== 'ALL' && emp.bidangId !== filterBidangId) {
        return false;
      }
      // Filter by Status ASN
      if (filterStatusAsn !== 'ALL' && (emp.statusAsn || 'PNS') !== filterStatusAsn) {
        return false;
      }
      // Filter by search
      if (search.trim()) {
        const q = search.toLowerCase();
        const dept = deptsMap.get(emp.bidangId);
        const matchName = emp.nama.toLowerCase().includes(q);
        const matchNip = emp.nip.includes(q);
        const matchJabatan = emp.jabatan.toLowerCase().includes(q);
        const matchPangkat = emp.pangkatGol ? emp.pangkatGol.toLowerCase().includes(q) : false;
        const matchDept = dept ? (dept.nama.toLowerCase().includes(q) || dept.inisial.toLowerCase().includes(q)) : false;
        return matchName || matchNip || matchJabatan || matchPangkat || matchDept;
      }
      return true;
    });

    // Sort logic
    result = [...result].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.nama.localeCompare(a.nama, 'id', { sensitivity: 'base' });
      }
      if (sortBy === 'bidang-asc') {
        const deptA = deptsMap.get(a.bidangId)?.inisial || '';
        const deptB = deptsMap.get(b.bidangId)?.inisial || '';
        const compareDept = deptA.localeCompare(deptB, 'id', { sensitivity: 'base' });
        if (compareDept !== 0) return compareDept;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      return 0;
    });

    return result;
  }, [employees, filterBidangId, filterStatusAsn, search, sortBy, deptsMap]);

  // Grouped by Bidang for display
  const groupedEmployees = useMemo(() => {
    if (!groupByBidang && sortBy !== 'bidang-asc') return null;

    const map = new Map<string, Employee[]>();
    for (const emp of processedEmployees) {
      const list = map.get(emp.bidangId) || [];
      list.push(emp);
      map.set(emp.bidangId, list);
    }
    return map;
  }, [processedEmployees, groupByBidang, sortBy]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Unified Sticky Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Sidebar Toggle + Icon + Title */}
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
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Master Data Pegawai
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kelola data pegawai
                </p>
              </div>
            </div>

            {/* Right: Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => downloadEmployeeTemplate(departments)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                title="Download Template Format Excel untuk Impor Massal"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Format Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs cursor-pointer"
                title="Impor Pegawai dari file Excel (.xlsx / .xls)"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Impor Excel</span>
              </button>

              <button
                type="button"
                onClick={() => exportEmployeesToExcel(employees, departments, 'Data_Pegawai_SIM_SPPD')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                title="Ekspor Seluruh Data Pegawai ke Spreadsheet Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ekspor Excel</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Tambah Pegawai</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

      {/* Alert Notification */}
      {alertSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Pegawai</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {asnStats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Seluruh Pegawai</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-blue-200 dark:border-blue-900/60 shadow-2xs bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">PNS</div>
          <div className="text-2xl font-extrabold text-blue-800 dark:text-blue-200 mt-1">
            {asnStats.pns}
          </div>
          <div className="text-[10px] text-blue-600/80 dark:text-blue-400 mt-0.5">Pegawai Negeri Sipil</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">PPPK</div>
          <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">
            {asnStats.pppk}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">Perjanjian Kerja Penuh</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-orange-200 dark:border-orange-900/60 shadow-2xs bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
          <div className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">PPPK PW</div>
          <div className="text-2xl font-extrabold text-orange-800 dark:text-orange-200 mt-1">
            {asnStats.pppkPw}
          </div>
          <div className="text-[10px] text-orange-600/80 dark:text-orange-400 mt-0.5">Perjanjian Kerja Paruh Waktu</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-purple-200 dark:border-purple-900/60 shadow-2xs bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
          <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">Non ASN/Lainnya</div>
          <div className="text-2xl font-extrabold text-purple-800 dark:text-purple-200 mt-1">
            {asnStats.nonAsn}
          </div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">Tenaga Non ASN / Lainnya</div>
        </div>
      </div>

      {/* Form Tambah/Ubah Pegawai (Collapsible Card) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-indigo-500/40 shadow-md animate-in fade-in zoom-in-98 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-indigo-600" />
              <span>{editingEmp ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'}</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingEmp(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="e.g. Dr. H. Ahmad Fauzi, S.T., M.Si."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>
                    NIP {statusAsn !== 'Non ASN/Lainnya' && <span className="text-rose-500">*</span>}
                  </span>
                  {statusAsn === 'Non ASN/Lainnya' && (
                    <span className="text-[10px] text-slate-400 font-normal">Opsional / No. ID</span>
                  )}
                </label>
                <input
                  type="text"
                  required={statusAsn !== 'Non ASN/Lainnya'}
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder={statusAsn === 'Non ASN/Lainnya' ? 'e.g. NIK / No. Kontrak atau -' : 'e.g. 19850315 201001 1 002'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Pangkat / Golongan</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNS / PPPK</span>
                </label>
                <input
                  type="text"
                  list="employee-pangkat-list"
                  value={pangkatGol}
                  onChange={(e) => setPangkatGol(e.target.value)}
                  placeholder="e.g. Pembina (IV/a) / Penata (III/c)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <datalist id="employee-pangkat-list">
                  {DAFTAR_PANGKAT_ASN.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.kategori} - {p.pangkat ? `${p.pangkat} (${p.golongan})` : p.golongan}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="e.g. Analis Kebijakan Ahli Muda"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bidang / Unit Kerja <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bidangId}
                  onChange={(e) => setBidangId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      [{dept.inisial}] {dept.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Kepegawaian Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Status Kepegawaian <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { value: 'PNS' as AsnStatus, label: 'PNS', desc: 'Pegawai Negeri Sipil' },
                  { value: 'PPPK' as AsnStatus, label: 'PPPK', desc: 'Perjanjian Kerja Penuh' },
                  { value: 'PPPK PW' as AsnStatus, label: 'PPPK PW', desc: 'Perjanjian Kerja Paruh Waktu' },
                  { value: 'Non ASN/Lainnya' as AsnStatus, label: 'Non ASN/Lainnya', desc: 'Tenaga Kontrak / Lainnya' }
                ].map((opt) => {
                  const isChecked = statusAsn === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex flex-col p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{opt.label}</span>
                        <input
                          type="radio"
                          name="statusAsn"
                          value={opt.value}
                          checked={isChecked}
                          onChange={() => setStatusAsn(opt.value)}
                          className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEmp(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {editingEmp ? 'Simpan Perubahan' : 'Tambahkan Pegawai'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search */}
          <div className="relative min-w-56 flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Status Kepegawaian */}
          <div className="flex items-center gap-1.5">
            <select
              value={filterStatusAsn}
              onChange={(e) => setFilterStatusAsn(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-3 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              <option value="ALL">Semua Status Pegawai</option>
              <option value="PNS">Status: PNS</option>
              <option value="PPPK">Status: PPPK</option>
              <option value="PPPK PW">Status: PPPK PW</option>
              <option value="Non ASN/Lainnya">Status: Non ASN/Lainnya</option>
            </select>
          </div>

          {/* Filter Bidang */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterBidangId}
              onChange={(e) => setFilterBidangId(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-3 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Bidang</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  [{dept.inisial}] {dept.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Group by Bidang Toggle */}
          <button
            type="button"
            onClick={() => setGroupByBidang(!groupByBidang)}
            className={`px-3 py-1.5 text-xs rounded-xl border transition-colors cursor-pointer ${
              groupByBidang
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Kelompokkan per Bidang
          </button>
        </div>

        {/* View Mode & Sorting options */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tampilan Tabel dengan Kolom Pangkat/Gol"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Sorting */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Urutkan:</span>
            <button
              type="button"
              onClick={() => setSortBy('name-asc')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                sortBy === 'name-asc'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
              title="Urutkan A-Z"
            >
              <ArrowDownAZ className="w-3.5 h-3.5" />
              <span>A-Z</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name-desc')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                sortBy === 'name-desc'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
              title="Urutkan Z-A"
            >
              <ArrowUpAZ className="w-3.5 h-3.5" />
              <span>Z-A</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('bidang-asc')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                sortBy === 'bidang-asc'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
              title="Urutkan Berdasarkan Bidang"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bidang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Employees Content */}
      {processedEmployees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Tidak ada data pegawai yang sesuai
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian, filter status ASN, atau filter bidang penugasan.
          </p>
        </div>
      ) : groupedEmployees ? (
        /* Grouped view */
        <div className="space-y-6">
          {Array.from(groupedEmployees.entries()).map(([bId, emps]) => {
            const dept = deptsMap.get(bId);
            return (
              <div key={bId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {dept && (
                      <span
                        style={getDeptBadgeStyle(dept)}
                        className={`text-xs font-bold px-2 py-0.5 rounded shadow-2xs ${dept.color.badgeBg}`}
                      >
                        {dept.inisial}
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {dept?.nama || 'Bidang Lainnya'}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {emps.length} Pegawai
                  </span>
                </div>

                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-center w-12">No</th>
                          <th className="py-2.5 px-4 min-w-[200px]">Pegawai & NIP</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Pangkat / Gol</th>
                          <th className="py-2.5 px-3 min-w-[170px]">Jabatan</th>
                          <th className="py-2.5 px-3 text-center w-28">Status</th>
                          <th className="py-2.5 px-3 text-center w-24">SPPD</th>
                          <th className="py-2.5 px-3 text-center w-20">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {emps.map((emp, idx) => (
                          <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {emp.nama}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                NIP. {emp.nip}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {emp.pangkatGol ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                                  <Award className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>{emp.pangkatGol}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              {emp.jabatan}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getAsnBadgeClass(emp.statusAsn || 'PNS')}`}>
                                {emp.statusAsn || 'PNS'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {tripCountMap.get(emp.id) || 0} SPPD
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(emp)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Ubah data pegawai"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(emp)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Hapus pegawai"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {emps.map((emp) => (
                      <EmployeeRowCard
                        key={emp.id}
                        emp={emp}
                        dept={dept}
                        tripsCount={tripCountMap.get(emp.id) || 0}
                        onEdit={() => handleOpenEdit(emp)}
                        onDelete={() => handleDelete(emp)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* Flat Table View with Explicit Pangkat/Gol Column */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 min-w-[210px]">Nama Pegawai</th>
                  <th className="py-3 px-3 min-w-[155px]">Pangkat / Gol</th>
                  <th className="py-3 px-3 min-w-[170px]">Jabatan</th>
                  <th className="py-3 px-3 min-w-[130px]">Bidang</th>
                  <th className="py-3 px-3 text-center w-28">Status</th>
                  <th className="py-3 px-3 text-center w-24">Total SPPD</th>
                  <th className="py-3 px-3 text-center w-20">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {processedEmployees.map((emp, index) => {
                  const dept = deptsMap.get(emp.bidangId);
                  const tripsCount = tripCountMap.get(emp.id) || 0;
                  const status = emp.statusAsn || 'PNS';
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                              emp.avatarBg || 'bg-indigo-600'
                            }`}
                          >
                            {emp.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {emp.nama}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              NIP. {emp.nip}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {emp.pangkatGol ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                            <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{emp.pangkatGol}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- Belum diisi -</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {emp.jabatan}
                      </td>
                      <td className="py-3 px-3">
                        {dept ? (
                          <span
                            style={getDeptBadgeStyle(dept)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded inline-block ${dept.color.badgeBg}`}
                            title={dept.nama}
                          >
                            [{dept.inisial}] {dept.nama}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getAsnBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                          {tripsCount} SPPD
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ubah data pegawai"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Hapus pegawai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Flat Card View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Daftar Pegawai ({processedEmployees.length} orang)</span>
            <span>Tindakan</span>
          </div>
          {processedEmployees.map((emp) => (
            <EmployeeRowCard
              key={emp.id}
              emp={emp}
              dept={deptsMap.get(emp.bidangId)}
              tripsCount={tripCountMap.get(emp.id) || 0}
              onEdit={() => handleOpenEdit(emp)}
              onDelete={() => handleDelete(emp)}
            />
          ))}
        </div>
      )}

      {/* Bulk Excel Import Modal */}
      {onBulkImportEmployees && (
        <EmployeeImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          departments={departments}
          existingEmployees={employees}
          onImportSuccess={(updatedEmployees: Employee[], message: string) => {
            onBulkImportEmployees(updatedEmployees);
            setAlertSuccess(message);
            setTimeout(() => setAlertSuccess(null), 4000);
          }}
        />
      )}
      </main>
    </div>
  );
};

interface EmployeeRowCardProps {
  emp: Employee;
  dept?: Department;
  tripsCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

const EmployeeRowCard: React.FC<EmployeeRowCardProps> = ({
  emp,
  dept,
  tripsCount,
  onEdit,
  onDelete,
}) => {
  const status = emp.statusAsn || 'PNS';

  return (
    <div className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs ${
            emp.avatarBg || 'bg-indigo-600'
          }`}
        >
          {emp.nama.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {emp.nama}
            </span>
            {emp.pangkatGol && (
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                <Award className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>{emp.pangkatGol}</span>
              </span>
            )}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getAsnBadgeClass(
                status
              )}`}
            >
              {status}
            </span>
            {dept && (
              <span
                style={getDeptBadgeStyle(dept)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${dept.color.badgeBg}`}
              >
                {dept.inisial}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1 font-mono">
              <span>NIP. {emp.nip}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{emp.jabatan}</span>
            </span>
            <span>•</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              {tripsCount} Penugasan SPPD
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Ubah data pegawai"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Hapus pegawai"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
