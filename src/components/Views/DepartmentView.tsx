import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  Palette, 
  Sliders, 
  Check, 
  X, 
  Users, 
  Briefcase, 
  CheckCircle2,
  Menu
} from 'lucide-react';
import { Department, BusinessTrip, Employee } from '../../types/trip';
import { PRESET_DEPARTMENT_COLORS, QUICK_COLOR_SWATCHES, getDeptBadgeStyle } from '../../utils/colorUtils';

interface DepartmentViewProps {
  departments: Department[];
  allTrips: BusinessTrip[];
  employees: Employee[];
  onAddDepartment: (dept: Omit<Department, 'id'>) => void;
  onUpdateDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
  onToggleSidebar?: () => void;
}

export const DepartmentView: React.FC<DepartmentViewProps> = ({
  departments,
  allTrips,
  employees,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onToggleSidebar,
}) => {
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [inisial, setInisial] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [colorMode, setColorMode] = useState<'preset' | 'custom'>('preset');
  const [colorIndex, setColorIndex] = useState(0);
  const [customHex, setCustomHex] = useState('#2563EB');

  // Employee count per dept
  const employeeCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      map.set(emp.bidangId, (map.get(emp.bidangId) || 0) + 1);
    }
    return map;
  }, [employees]);

  // Trips count per dept
  const tripCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const trip of allTrips) {
      map.set(trip.bidangId, (map.get(trip.bidangId) || 0) + 1);
    }
    return map;
  }, [allTrips]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setNama('');
    setInisial('');
    setDeskripsi('');
    setColorMode('preset');
    setColorIndex(0);
    setCustomHex('#2563EB');
    setShowForm(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setNama(dept.nama);
    setInisial(dept.inisial);
    setDeskripsi(dept.deskripsi || '');
    
    if (dept.color.hexColor) {
      setCustomHex(dept.color.hexColor);
      const foundIdx = PRESET_DEPARTMENT_COLORS.findIndex(c => c.hex.toLowerCase() === dept.color.hexColor?.toLowerCase());
      if (foundIdx >= 0) {
        setColorIndex(foundIdx);
        setColorMode('preset');
      } else {
        setColorMode('custom');
      }
    } else {
      const foundIdx = PRESET_DEPARTMENT_COLORS.findIndex(c => c.border === dept.color.border);
      setColorIndex(foundIdx >= 0 ? foundIdx : 0);
      setColorMode('preset');
    }
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !inisial.trim()) return;

    let selectedColor;
    if (colorMode === 'custom') {
      selectedColor = {
        bg: 'bg-slate-50',
        text: 'text-slate-800',
        border: 'border-slate-300',
        badgeBg: 'text-white',
        dotBg: 'bg-slate-500',
        hexColor: customHex
      };
    } else {
      const preset = PRESET_DEPARTMENT_COLORS[colorIndex];
      selectedColor = {
        bg: preset.bg,
        text: preset.text,
        border: preset.border,
        badgeBg: preset.badgeBg,
        dotBg: preset.dotBg,
        hexColor: preset.hex
      };
    }

    if (editingDept) {
      onUpdateDepartment({
        ...editingDept,
        nama: nama.trim(),
        inisial: inisial.trim().toUpperCase(),
        deskripsi: deskripsi.trim(),
        color: selectedColor,
      });
      setAlertSuccess(`Bidang "${nama.trim()}" berhasil diperbarui.`);
    } else {
      onAddDepartment({
        nama: nama.trim(),
        inisial: inisial.trim().toUpperCase(),
        deskripsi: deskripsi.trim(),
        color: selectedColor,
      });
      setAlertSuccess(`Bidang baru "${nama.trim()}" berhasil ditambahkan.`);
    }

    setShowForm(false);
    setEditingDept(null);
    setTimeout(() => setAlertSuccess(null), 3500);
  };

  const handleDelete = (dept: Department) => {
    const activeTripsCount = tripCountMap.get(dept.id) || 0;
    const activeEmpCount = employeeCountMap.get(dept.id) || 0;

    let warningText = `Yakin ingin menghapus bidang "${dept.nama}"?`;
    if (activeTripsCount > 0 || activeEmpCount > 0) {
      warningText = `Bidang "${dept.nama}" memiliki ${activeEmpCount} pegawai dan ${activeTripsCount} perjalanan dinas terkait. Yakin ingin menghapus?`;
    }

    if (window.confirm(warningText)) {
      onDeleteDepartment(dept.id);
      setAlertSuccess(`Bidang "${dept.nama}" berhasil dihapus.`);
      setTimeout(() => setAlertSuccess(null), 3000);
    }
  };

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
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Master Data Bidang &amp; Inisial
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kelola unit kerja
                </p>
              </div>
            </div>

            {/* Right: Header Action Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Tambah Bidang Baru</span>
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

      {/* Form Tambah/Ubah Bidang (Collapsible Card) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-indigo-500/40 shadow-md animate-in fade-in zoom-in-98 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>{editingDept ? 'Ubah Data Bidang' : 'Tambah Bidang Baru'}</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingDept(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bidang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="e.g. Bidang Tata Ruang & Pertanahan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Inisial SPPD <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={inisial}
                    onChange={(e) => setInisial(e.target.value.toUpperCase())}
                    placeholder="e.g. BID-TR"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white uppercase font-bold tracking-wider focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi / Lingkup Tugas
              </label>
              <input
                type="text"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Penjelasan singkat peran atau cakupan tugas bidang ini..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Color Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Warna Identitas Bidang
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setColorMode('preset')}
                    className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer ${
                      colorMode === 'preset'
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('custom')}
                    className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer ${
                      colorMode === 'custom'
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {colorMode === 'preset' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_DEPARTMENT_COLORS.map((col, idx) => (
                    <button
                      key={col.label}
                      type="button"
                      onClick={() => setColorIndex(idx)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        colorIndex === idx
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 font-semibold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="text-xs text-slate-800 dark:text-slate-200">
                          {col.label}
                        </span>
                      </div>
                      {colorIndex === idx && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-700"
                    />
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      placeholder="#2563EB"
                      className="w-24 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white uppercase"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setCustomHex(hex)}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-md border transition-transform cursor-pointer hover:scale-110 ${
                          customHex.toLowerCase() === hex.toLowerCase()
                            ? 'ring-2 ring-indigo-500 ring-offset-1 border-white'
                            : 'border-black/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Badge Preview */}
              <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Pratinjau Badge Inisial di Kalender:
                </span>
                <span
                  style={
                    colorMode === 'custom'
                      ? { backgroundColor: customHex, color: '#ffffff' }
                      : { backgroundColor: PRESET_DEPARTMENT_COLORS[colorIndex].hex, color: '#ffffff' }
                  }
                  className="text-xs font-bold px-2.5 py-1 rounded-md shadow-xs"
                >
                  {inisial.trim() || 'INISIAL'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDept(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {editingDept ? 'Simpan Perubahan' : 'Tambahkan Bidang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const empCount = employeeCountMap.get(dept.id) || 0;
          const tripCount = tripCountMap.get(dept.id) || 0;

          return (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span
                    style={getDeptBadgeStyle(dept)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs ${dept.color.badgeBg}`}
                  >
                    {dept.inisial}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Ubah data bidang"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Hapus bidang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                  {dept.nama}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                  {dept.deskripsi || 'Tidak ada keterangan tambahan untuk bidang ini.'}
                </p>
              </div>

              {/* Stats Footer of the Card */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{empCount} Pegawai</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{tripCount} SPPD Diterbitkan</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      </main>
    </div>
  );
};
