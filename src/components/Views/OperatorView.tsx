import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building2,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  Power,
  Lock,
  Menu,
} from 'lucide-react';
import { ActivityLogAction, ActivityLogCategory, Department, OperatorAccount } from '../../types/trip';
import { getDeptBadgeStyle } from '../../utils/colorUtils';

interface OperatorViewProps {
  authToken: string;
  currentUsername: string;
  departments: Department[];
  onUnauthorized: () => void;
  onToggleSidebar?: () => void;
  onLogActivity?: (payload: {
    category: ActivityLogCategory;
    action: ActivityLogAction;
    title: string;
    details?: string;
    bidangId?: string;
    bidangInisial?: string;
    bidangNama?: string;
  }) => void;
}

export const OperatorView: React.FC<OperatorViewProps> = ({
  authToken,
  currentUsername,
  departments,
  onUnauthorized,
  onToggleSidebar,
  onLogActivity,
}) => {
  const [operators, setOperators] = useState<OperatorAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBidangId, setFilterBidangId] = useState('ALL');

  const [showForm, setShowForm] = useState(false);
  const [editingOp, setEditingOp] = useState<OperatorAccount | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bidangId, setBidangId] = useState(departments[0]?.id || '');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Admin self password change state
  const [showAdminPassForm, setShowAdminPassForm] = useState(false);
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [isSavingAdminPass, setIsSavingAdminPass] = useState(false);

  const deptsMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/operators', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await response.json();
      if (response.ok && data.success) {
        setOperators(data.operators || []);
      } else {
        setAlertError(data.error || 'Gagal memuat daftar operator.');
      }
    } catch {
      setAlertError('Gagal terhubung ke server untuk memuat data operator.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, onUnauthorized]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleOpenAdd = () => {
    setEditingOp(null);
    setUsername('');
    setDisplayName('');
    setPassword('');
    setShowPassword(false);
    setBidangId(departments[0]?.id || '');
    setIsActive(true);
    setAlertError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (op: OperatorAccount) => {
    setEditingOp(op);
    setUsername(op.username);
    setDisplayName(op.displayName || '');
    setPassword('');
    setShowPassword(false);
    setBidangId(op.bidangId || departments[0]?.id || '');
    setIsActive(op.isActive);
    setAlertError(null);
    setShowForm(true);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setAlertError('Username wajib diisi.');
      return;
    }
    if (!editingOp && password.length < 4) {
      setAlertError('Password operator baru minimal 4 karakter.');
      return;
    }
    if (editingOp && password.length > 0 && password.length < 4) {
      setAlertError('Password baru minimal 4 karakter.');
      return;
    }
    if (!bidangId) {
      setAlertError('Pilih bidang akses untuk operator ini.');
      return;
    }

    const selectedDept = deptsMap.get(bidangId);
    setIsSaving(true);

    try {
      const url = editingOp ? `/api/operators/${editingOp.id}` : '/api/operators';
      const method = editingOp ? 'PUT' : 'POST';
      const payload: Record<string, unknown> = {
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        bidangId,
        bidangNama: selectedDept?.nama,
        bidangInisial: selectedDept?.inisial,
        isActive,
      };
      if (password.length > 0) {
        payload.password = password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAlertError(data.error || 'Gagal menyimpan data operator.');
        return;
      }

      setAlertSuccess(
        editingOp
          ? `Akun operator "${cleanUsername}" berhasil diperbarui.`
          : `Operator baru "${cleanUsername}" untuk [${selectedDept?.inisial || 'Bidang'}] berhasil ditambahkan.`
      );
      onLogActivity?.({
        category: 'operator',
        action: editingOp ? 'Ubah' : 'Tambah',
        title: editingOp
          ? `Memperbarui akun operator "${cleanUsername}"`
          : `Menambahkan akun operator "${cleanUsername}"`,
        details: `Akses bidang: [${selectedDept?.inisial || '-'}] ${selectedDept?.nama || ''}`,
        bidangId: selectedDept?.id,
        bidangInisial: selectedDept?.inisial,
        bidangNama: selectedDept?.nama,
      });
      setShowForm(false);
      setEditingOp(null);
      await fetchOperators();
      setTimeout(() => setAlertSuccess(null), 4000);
    } catch {
      setAlertError('Terjadi kesalahan koneksi saat menyimpan data operator.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (op: OperatorAccount) => {
    setAlertError(null);
    try {
      const response = await fetch(`/api/operators/${op.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isActive: !op.isActive }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAlertError(data.error || 'Gagal mengubah status operator.');
        return;
      }

      setAlertSuccess(
        `Akun "${op.username}" ${!op.isActive ? 'diaktifkan kembali' : 'dinonaktifkan'}.`
      );
      onLogActivity?.({
        category: 'operator',
        action: 'Ubah',
        title: `${!op.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} operator "${op.username}"`,
        details: `Bidang: ${op.bidangInisial || op.bidangNama || '-'}`,
        bidangId: op.bidangId,
        bidangInisial: op.bidangInisial,
        bidangNama: op.bidangNama,
      });
      await fetchOperators();
      setTimeout(() => setAlertSuccess(null), 3500);
    } catch {
      setAlertError('Gagal terhubung ke server.');
    }
  };

  const handleDeleteOperator = async (op: OperatorAccount) => {
    if (!window.confirm(`Yakin ingin menghapus akun operator "${op.username}"?`)) {
      return;
    }

    setAlertError(null);
    try {
      const response = await fetch(`/api/operators/${op.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAlertError(data.error || 'Gagal menghapus operator.');
        return;
      }

      setAlertSuccess(`Akun operator "${op.username}" telah dihapus.`);
      onLogActivity?.({
        category: 'operator',
        action: 'Hapus',
        title: `Menghapus akun operator "${op.username}"`,
        details: `Bidang: ${op.bidangInisial || op.bidangNama || '-'}`,
        bidangId: op.bidangId,
        bidangInisial: op.bidangInisial,
        bidangNama: op.bidangNama,
      });
      await fetchOperators();
      setTimeout(() => setAlertSuccess(null), 3500);
    } catch {
      setAlertError('Gagal terhubung ke server saat menghapus operator.');
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);

    if (!currentAdminPass || !newAdminPass) {
      setAlertError('Lengkapi password saat ini dan password baru.');
      return;
    }
    if (newAdminPass.length < 4) {
      setAlertError('Password baru Administrator minimal 4 karakter.');
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      setAlertError('Konfirmasi password baru tidak sama.');
      return;
    }

    setIsSavingAdminPass(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword: currentAdminPass,
          newPassword: newAdminPass,
        }),
      });

      if (response.status === 401 && newAdminPass) {
        const errData = await response.json();
        setAlertError(errData.error || 'Password saat ini tidak sesuai.');
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAlertError(data.error || 'Gagal memperbarui password Admin.');
        return;
      }

      setCurrentAdminPass('');
      setNewAdminPass('');
      setConfirmAdminPass('');
      setShowAdminPassForm(false);
      setAlertSuccess('Password akun Administrator berhasil diperbarui.');
      onLogActivity?.({
        category: 'auth',
        action: 'Ubah',
        title: `Memperbarui password akun "${currentUsername}"`,
      });
      setTimeout(() => setAlertSuccess(null), 4000);
    } catch {
      setAlertError('Gagal terhubung ke server saat memperbarui password.');
    } finally {
      setIsSavingAdminPass(false);
    }
  };

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      if (filterBidangId !== 'ALL' && op.bidangId !== filterBidangId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dept = deptsMap.get(op.bidangId);
        const matchUser = op.username.toLowerCase().includes(q);
        const matchName = op.displayName.toLowerCase().includes(q);
        const matchDept =
          dept?.nama.toLowerCase().includes(q) ||
          dept?.inisial.toLowerCase().includes(q) ||
          op.bidangNama?.toLowerCase().includes(q) ||
          op.bidangInisial?.toLowerCase().includes(q);
        if (!matchUser && !matchName && !matchDept) return false;
      }
      return true;
    });
  }, [operators, filterBidangId, searchQuery, deptsMap]);

  const activeCount = useMemo(
    () => operators.filter((op) => op.isActive).length,
    [operators]
  );

  const coveredDepartmentsCount = useMemo(() => {
    const ids = new Set(operators.filter((op) => op.isActive).map((op) => op.bidangId));
    return ids.size;
  }, [operators]);

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
                <UserCog className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Manajemen Operator Bidang
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manajemen user untuk operator
                </p>
              </div>
            </div>

            {/* Right: Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowAdminPassForm((prev) => !prev);
                  setAlertError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Ubah Password Admin</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Tambah Operator Baru</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

      {/* Alerts */}
      {alertSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {alertError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{alertError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertError(null)}
            className="text-rose-600 hover:text-rose-800 dark:hover:text-rose-200 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Total Akun Operator
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {operators.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Akun Operator Bidang terdaftar
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            Operator Aktif
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
            {activeCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Dapat masuk &amp; menginput SPPD bidang
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
            Bidang Terkelola
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1 tabular-nums">
            {coveredDepartmentsCount}{' '}
            <span className="text-xs font-normal text-slate-400">/ {departments.length} Bidang</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Bidang yang memiliki operator aktif
          </div>
        </div>
      </div>

      {/* Collapsible Admin Password Form */}
      {showAdminPassForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Ubah Password Akun Administrator ({currentUsername})</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAdminPassForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleChangeAdminPassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password Saat Ini <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentAdminPass}
                onChange={(e) => setCurrentAdminPass(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Konfirmasi Password Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmAdminPass}
                onChange={(e) => setConfirmAdminPass(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdminPassForm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingAdminPass}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
              >
                {isSavingAdminPass ? 'Menyimpan...' : 'Simpan Password Admin'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collapsible Add / Edit Operator Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-indigo-500/40 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>
                {editingOp
                  ? `Ubah Operator: ${editingOp.username}`
                  : 'Tambah Akun Operator Bidang Baru'}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingOp(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveOperator} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: user1 atau op_perencanaan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Huruf kecil, angka, titik (.), garis bawah (_), atau tanda hubung (-), tanpa spasi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Petugas / Keterangan Akun
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Operator Bidang Perencanaan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bidang yang Dapat Diisi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    required
                    value={bidangId}
                    onChange={(e) => setBidangId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        [{dept.inisial}] {dept.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Operator hanya dapat menginput SPPD atas nama bidang ini dan dapat menugaskan seluruh pegawai.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {editingOp ? 'Password Baru (Opsional)' : 'Password Login'}{' '}
                  {!editingOp && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingOp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      editingOp
                        ? 'Kosongkan jika tidak mengubah password'
                        : 'Minimal 4 karakter'
                    }
                    className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <label className="mt-2.5 inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Akun Aktif (diizinkan login)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOp(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSaving
                  ? 'Menyimpan...'
                  : editingOp
                  ? 'Simpan Perubahan'
                  : 'Buat Akun Operator'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          <div className="relative min-w-56 flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari username, nama, atau bidang..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

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
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredOperators.length}</strong> operator
        </div>
      </div>

      {/* Operators Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Memuat daftar akun operator...
          </div>
        ) : filteredOperators.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserCog className="w-11 h-11 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {operators.length === 0
                  ? 'Belum ada akun Operator Bidang'
                  : 'Tidak ada operator yang sesuai pencarian'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {operators.length === 0
                  ? 'Tambahkan akun operator agar setiap bidang dapat login dan menginput perjalanan dinasnya sendiri tanpa mengakses menu Pegawai atau Bidang.'
                  : 'Ubah kata kunci pencarian atau filter bidang untuk melihat akun lainnya.'}
              </p>
            </div>
            {operators.length === 0 && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Operator Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 min-w-[180px]">Username &amp; Petugas</th>
                  <th className="py-3 px-4 min-w-[220px]">Akses Bidang</th>
                  <th className="py-3 px-4 min-w-[220px]">Batasan Hak Akses</th>
                  <th className="py-3 px-3 text-center w-28">Status</th>
                  <th className="py-3 px-3 text-center w-28">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredOperators.map((op, index) => {
                  const dept = deptsMap.get(op.bidangId);
                  const deptInisial = dept?.inisial || op.bidangInisial || 'BIDANG';
                  const deptNama = dept?.nama || op.bidangNama || 'Bidang Tidak Ditemukan';

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px] tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {op.username}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {op.displayName}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={dept ? getDeptBadgeStyle(dept) : undefined}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs ${
                              dept?.color?.badgeBg || 'bg-slate-700 text-white'
                            }`}
                          >
                            {deptInisial}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {deptNama}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                        Input SPPD khusus <strong className="text-slate-800 dark:text-slate-200">{deptInisial}</strong> · Seluruh Pegawai · Tanpa menu Pegawai/Bidang
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[11px] font-semibold ${
                            op.isActive
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {op.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(op)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ubah operator / reset password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(op)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              op.isActive
                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={op.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOperator(op)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Hapus akun operator"
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
        )}
      </div>
      </main>
    </div>
  );
};
