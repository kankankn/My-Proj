import React, { useState, useMemo } from 'react';
import { 
  X, 
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
  Award
} from 'lucide-react';
import { Employee, Department, BusinessTrip, AsnStatus } from '../../types/trip';
import { exportEmployeesToExcel, downloadEmployeeTemplate } from '../../utils/excelEmployeeUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { ASN_STATUS_OPTIONS, getAsnBadgeClass } from '../../utils/asnUtils';
import { DAFTAR_PANGKAT_ASN } from '../../utils/asnPangkatUtils';
import { EmployeeImportModal } from './EmployeeImportModal';

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  departments: Department[];
  allTrips: BusinessTrip[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onBulkImportEmployees?: (employees: Employee[]) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'bidang-asc';

export const EmployeeManagementModal: React.FC<EmployeeManagementModalProps> = ({
  isOpen,
  onClose,
  employees,
  departments,
  allTrips,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBulkImportEmployees,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [filterBidangId, setFilterBidangId] = useState<string>('ALL');
  const [filterStatusAsn, setFilterStatusAsn] = useState<string>('ALL');
  const [groupByBidang, setGroupByBidang] = useState<boolean>(false);
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
    } else {
      onAddEmployee({
        nama: nama.trim(),
        nip: finalNip,
        pangkatGol: pangkatGol.trim() || undefined,
        jabatan: jabatan.trim(),
        bidangId,
        statusAsn,
      });
    }

    setShowForm(false);
    setEditingEmp(null);
  };

  const handleDelete = (emp: Employee) => {
    const activeTripsCount = tripCountMap.get(emp.id) || 0;
    const confirmText = activeTripsCount > 0
      ? `Pegawai "${emp.nama}" tercatat dalam ${activeTripsCount} perjalanan dinas. Yakin ingin menghapus? (Jadwal perjalanan tidak akan terhapus otomatis)`
      : `Yakin ingin menghapus pegawai "${emp.nama}"?`;

    if (window.confirm(confirmText)) {
      onDeleteEmployee(emp.id);
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
        const matchPangkat = emp.pangkatGol ? emp.pangkatGol.toLowerCase().includes(q) : false;
        const matchJabatan = emp.jabatan.toLowerCase().includes(q);
        const matchDept = dept ? (dept.nama.toLowerCase().includes(q) || dept.inisial.toLowerCase().includes(q)) : false;
        return matchName || matchNip || matchPangkat || matchJabatan || matchDept;
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
  }, [employees, filterBidangId, filterStatusAsn, search, sortBy, deptsMap, tripCountMap]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Data Pegawai
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola daftar pegawai, sortir berdasarkan alfabet nama atau bidang penugasan
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

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          
          {/* Success Alert Banner (e.g. After Import) */}
          {alertSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2.5 text-emerald-800 text-xs font-medium animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{alertSuccess}</span>
              </div>
              <button
                onClick={() => setAlertSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Actions: Search, Excel Tools, & Add button */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-56">
              <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pegawai, NIP, jabatan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

            <div className="flex items-center gap-2 flex-wrap">
              {/* Unduh Template Excel */}
              <button
                type="button"
                onClick={() => downloadEmployeeTemplate(departments)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Unduh format file Excel kosong untuk diisi data pegawai"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Template</span>
              </button>

              {/* Ekspor Excel */}
              <button
                type="button"
                onClick={() => {
                  const targetList = processedEmployees.length > 0 ? processedEmployees : employees;
                  const label = filterBidangId !== 'ALL' ? `_${deptsMap.get(filterBidangId)?.inisial || 'Filter'}` : '';
                  exportEmployeesToExcel(targetList, departments, `Data_Pegawai${label}`);
                  setAlertSuccess(`Berhasil mengekspor ${targetList.length} data pegawai ke file Excel.`);
                  setTimeout(() => setAlertSuccess(null), 4000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title={`Ekspor ${processedEmployees.length} pegawai ke file Excel (.xlsx)`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel ({processedEmployees.length})</span>
              </button>

              {/* Impor Excel */}
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Impor data pegawai massal dari file Excel (.xlsx, .xls, .csv)"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Impor Excel</span>
              </button>

              {!showForm && (
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Pegawai</span>
                </button>
              )}
            </div>
          </div>

          {/* Sorting & Filter Bar */}
          <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Sorting Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                Urutkan:
              </span>
              
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSortBy('name-asc')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    sortBy === 'name-asc'
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Urutkan alfabet nama A ke Z"
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                  <span>Alfabet (A - Z)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortBy('name-desc')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    sortBy === 'name-desc'
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Urutkan alfabet nama Z ke A"
                >
                  <ArrowUpAZ className="w-3.5 h-3.5" />
                  <span>Alfabet (Z - A)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSortBy('bidang-asc');
                    setGroupByBidang(true);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    sortBy === 'bidang-asc'
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Urutkan berdasarkan Bidang/Unit Kerja"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Berdasarkan Bidang</span>
                </button>
              </div>
            </div>

            {/* Filter by Bidang & Status ASN */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterBidangId}
                  onChange={(e) => setFilterBidangId(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Bidang ({employees.length})</option>
                  {departments.map((dept) => {
                    const count = employees.filter(e => e.bidangId === dept.id).length;
                    return (
                      <option key={dept.id} value={dept.id}>
                        [{dept.inisial}] {dept.nama} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter by Status ASN */}
              <div className="flex items-center gap-1">
                <select
                  value={filterStatusAsn}
                  onChange={(e) => setFilterStatusAsn(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Status Pegawai</option>
                  <option value="PNS">PNS ({employees.filter(e => (e.statusAsn || 'PNS') === 'PNS').length})</option>
                  <option value="PPPK">PPPK ({employees.filter(e => e.statusAsn === 'PPPK').length})</option>
                  <option value="PPPK PW">PPPK PW ({employees.filter(e => e.statusAsn === 'PPPK PW').length})</option>
                  <option value="Non ASN/Lainnya">Non ASN/Lainnya ({employees.filter(e => e.statusAsn === 'Non ASN/Lainnya').length})</option>
                </select>
              </div>

              {/* Group View Toggle Button when Bidang sorting */}
              {sortBy === 'bidang-asc' && (
                <button
                  type="button"
                  onClick={() => setGroupByBidang(!groupByBidang)}
                  className={`px-2 py-1 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                    groupByBidang
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {groupByBidang ? 'Mode Grup Aktif' : 'Grupkan per Bidang'}
                </button>
              )}
            </div>
          </div>

          {/* Inline Form for Add / Edit */}
          {showForm && (
            <form onSubmit={handleSave} className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-950">
                  {editingEmp ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.T."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NIP {statusAsn !== 'Non ASN/Lainnya' ? '*' : '(Opsional)'}
                  </label>
                  <input
                    type="text"
                    required={statusAsn !== 'Non ASN/Lainnya'}
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder={statusAsn === 'Non ASN/Lainnya' ? 'Contoh: NIK / No. Kontrak atau -' : 'Contoh: 19850110 200901 1 002'}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status Kepegawaian *
                  </label>
                  <select
                    value={statusAsn}
                    onChange={(e) => setStatusAsn(e.target.value as AsnStatus)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (Pegawai Pemerintah Perjanjian Kerja)</option>
                    <option value="PPPK PW">PPPK PW (PPPK Paruh Waktu)</option>
                    <option value="Non ASN/Lainnya">Non ASN/Lainnya (Tenaga Kontrak / Lainnya)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Pangkat / Golongan</span>
                    <span className="text-[10px] text-slate-400 font-normal">Pilih / Ketik</span>
                  </label>
                  <input
                    type="text"
                    list="modal-employee-pangkat-list"
                    value={pangkatGol}
                    onChange={(e) => setPangkatGol(e.target.value)}
                    placeholder="Contoh: Penata (III/c)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="modal-employee-pangkat-list">
                    {DAFTAR_PANGKAT_ASN.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.kategori} - {p.pangkat ? `${p.pangkat} (${p.golongan})` : p.golongan}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jabatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Analis Kebijakan Ahli Muda"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Unit Kerja / Bidang
                  </label>
                  <select
                    value={bidangId}
                    onChange={(e) => setBidangId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        [{dept.inisial}] {dept.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-2xs"
                >
                  Simpan Pegawai
                </button>
              </div>
            </form>
          )}

          {/* List of Employees Header Counter */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Menampilkan <strong className="text-slate-900">{processedEmployees.length}</strong> pegawai
              {filterBidangId !== 'ALL' && ` pada ${deptsMap.get(filterBidangId)?.nama || 'bidang terpilih'}`}
            </span>
            <span className="text-[11px] text-slate-500">
              Urutan: {sortBy === 'name-asc' ? 'Alfabet (A - Z)' : sortBy === 'name-desc' ? 'Alfabet (Z - A)' : sortBy === 'bidang-asc' ? 'Bidang' : 'Frekuensi Dinas'}
            </span>
          </div>

          {/* Display Mode: Grouped by Bidang */}
          {groupedEmployees ? (
            <div className="space-y-4">
              {Array.from(groupedEmployees.entries()).map(([deptId, emps]) => {
                const dept = deptsMap.get(deptId);
                return (
                  <div key={deptId} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {/* Bidang Header */}
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          style={getDeptBadgeStyle(dept)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded tracking-wide shadow-2xs ${dept?.color?.badgeBg || 'bg-slate-700 text-white'}`}
                        >
                          [{dept?.inisial || 'DINAS'}]
                        </span>
                        <span className="font-bold text-xs text-slate-900">{dept?.nama || 'Bidang'}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {emps.length} Pegawai
                      </span>
                    </div>

                    {/* Employees in this Bidang */}
                    <div className="divide-y divide-slate-100">
                      {emps.map((emp) => {
                        const tripCount = tripCountMap.get(emp.id) || 0;
                        return (
                          <div key={emp.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 transition-colors">
                            <div className="truncate">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="font-bold text-slate-900">{emp.nama}</p>
                                {emp.pangkatGol && (
                                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-1 shadow-2xs">
                                    <Award className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span>{emp.pangkatGol}</span>
                                  </span>
                                )}
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${getAsnBadgeClass(emp.statusAsn)}`}>
                                  {emp.statusAsn || 'PNS'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                {emp.jabatan} • NIP: {emp.nip}
                              </p>
                              <p className="text-[10px] text-indigo-700 font-medium">
                                Total {tripCount} kali perjalanan dinas
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                                title="Ubah data pegawai"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(emp)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Hapus pegawai"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat List of Employees */
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
              {processedEmployees.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  Tidak ada data pegawai yang sesuai dengan pencarian atau filter.
                </div>
              ) : (
                processedEmployees.map((emp) => {
                  const dept = deptsMap.get(emp.bidangId);
                  const tripCount = tripCountMap.get(emp.id) || 0;

                  return (
                    <div key={emp.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className="truncate">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-bold text-slate-900">{emp.nama}</span>
                          {emp.pangkatGol && (
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-1 shadow-2xs">
                              <Award className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{emp.pangkatGol}</span>
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${getAsnBadgeClass(emp.statusAsn)}`}>
                            {emp.statusAsn || 'PNS'}
                          </span>
                          {dept && (
                            <span
                              style={getDeptBadgeStyle(dept)}
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded tracking-wide shadow-2xs ${dept.color.badgeBg}`}
                            >
                              [{dept.inisial}]
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {emp.jabatan} • NIP: {emp.nip}
                        </p>
                        <p className="text-[10px] text-indigo-700 font-medium mt-0.5">
                          {dept?.nama} • {tripCount} kali dinas
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="Ubah data pegawai"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Hapus pegawai"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Format Excel: Nama, NIP, Jabatan, Bidang</span>
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline">Total {employees.length} pegawai terdaftar</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>

      {/* Modal Impor Excel */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        departments={departments}
        existingEmployees={employees}
        onImportSuccess={(updatedEmployees, message) => {
          if (onBulkImportEmployees) {
            onBulkImportEmployees(updatedEmployees);
          }
          setAlertSuccess(message);
          setTimeout(() => setAlertSuccess(null), 6000);
        }}
      />
    </div>
  );
};
