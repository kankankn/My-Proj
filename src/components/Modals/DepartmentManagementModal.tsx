import React, { useState } from 'react';
import { X, Building2, Plus, Edit2, Trash2, Tag, Palette, Sliders, Check } from 'lucide-react';
import { Department, BusinessTrip } from '../../types/trip';
import { PRESET_DEPARTMENT_COLORS, QUICK_COLOR_SWATCHES, getDeptBadgeStyle } from '../../utils/colorUtils';

interface DepartmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  allTrips: BusinessTrip[];
  onAddDepartment: (dept: Omit<Department, 'id'>) => void;
  onUpdateDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
}

export const DepartmentManagementModal: React.FC<DepartmentManagementModalProps> = ({
  isOpen,
  onClose,
  departments,
  allTrips,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
}) => {
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [nama, setNama] = useState('');
  const [inisial, setInisial] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [colorMode, setColorMode] = useState<'preset' | 'custom'>('preset');
  const [colorIndex, setColorIndex] = useState(0);
  const [customHex, setCustomHex] = useState('#2563EB');

  if (!isOpen) return null;

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
      const foundIdx = PRESET_DEPARTMENT_COLORS.findIndex(c => c.badgeBg === dept.color.badgeBg);
      if (foundIdx >= 0) {
        setColorIndex(foundIdx);
        setCustomHex(PRESET_DEPARTMENT_COLORS[foundIdx].hex);
        setColorMode('preset');
      } else {
        setColorMode('custom');
        setCustomHex('#2563EB');
      }
    }
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !inisial.trim()) return;

    let chosenColor: Department['color'];

    if (colorMode === 'preset') {
      const preset = PRESET_DEPARTMENT_COLORS[colorIndex];
      chosenColor = {
        ...preset,
        hexColor: preset.hex,
      };
    } else {
      const cleanHex = customHex.startsWith('#') ? customHex.toUpperCase() : `#${customHex.toUpperCase()}`;
      chosenColor = {
        badgeBg: 'text-white shadow-2xs font-semibold',
        dotBg: '',
        bg: 'bg-slate-50',
        text: 'text-slate-800',
        border: 'border-slate-200',
        hexColor: cleanHex,
      };
    }

    if (editingDept) {
      onUpdateDepartment({
        ...editingDept,
        nama: nama.trim(),
        inisial: inisial.trim().toUpperCase(),
        deskripsi: deskripsi.trim(),
        color: chosenColor,
      });
    } else {
      onAddDepartment({
        nama: nama.trim(),
        inisial: inisial.trim().toUpperCase(),
        deskripsi: deskripsi.trim(),
        color: chosenColor,
      });
    }

    setShowForm(false);
    setEditingDept(null);
  };

  const activeHex = colorMode === 'preset' ? PRESET_DEPARTMENT_COLORS[colorIndex].hex : customHex;

  const handleDelete = (dept: Department) => {
    const linkedTrips = allTrips.filter(t => t.bidangId === dept.id).length;
    if (linkedTrips > 0) {
      alert(`Bidang "${dept.nama}" digunakan oleh ${linkedTrips} kegiatan dinas. Harap ubah kegiatan terkait terlebih dahulu sebelum menghapus bidang ini.`);
      return;
    }
    if (window.confirm(`Yakin ingin menghapus Bidang "${dept.nama}"?`)) {
      onDeleteDepartment(dept.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Data Bidang / Unit Pemberi Perintah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola nama bidang dan inisial kode yang tampil pada kalender
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
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-700">
              Inisial ini akan otomatis ditampilkan di setiap kartu kegiatan pada kalender.
            </p>
            {!showForm && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bidang</span>
              </button>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSave} className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  {editingDept ? 'Ubah Bidang' : 'Tambah Bidang Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-slate-700 hover:text-slate-900"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Bidang *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Bidang Pengelolaan Data & Statistik"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Inisial / Singkatan Kalender (Maks 7 Huruf) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={inisial}
                    onChange={(e) => setInisial(e.target.value.toUpperCase())}
                    placeholder="Contoh: DATA-TI"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Color Selection Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Pilih & Atur Warna Label Kalender:
                  </label>
                  {/* Mode switcher tabs */}
                  <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setColorMode('preset')}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                        colorMode === 'preset'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Palette className="w-3 h-3" />
                      <span>Palet Warna</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode('custom')}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                        colorMode === 'custom'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Kustom / Color Slider</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Preset Palette Grid */}
                {colorMode === 'preset' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50">
                    {PRESET_DEPARTMENT_COLORS.map((preset, idx) => (
                      <button
                        type="button"
                        key={preset.label}
                        onClick={() => {
                          setColorIndex(idx);
                          setCustomHex(preset.hex);
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                          colorIndex === idx
                            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-200 dark:ring-indigo-800'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate">
                            {preset.label.split(' ')[0]}
                          </span>
                        </div>
                        {colorIndex === idx && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tab 2: Custom Color Slider, Native Color Picker & Quick Swatches */}
                {colorMode === 'custom' && (
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Native Color Picker & Slider */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Color Slider / Picker:
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="color"
                            value={customHex.startsWith('#') ? customHex : `#${customHex}`}
                            onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                            className="w-10 h-8 rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 cursor-pointer bg-white dark:bg-slate-700 shadow-2xs"
                            title="Klik untuk membuka slider warna / color picker"
                          />
                        </div>
                      </div>

                      {/* Manual Hex Input */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Kode HEX:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={7}
                            value={customHex}
                            onChange={(e) => setCustomHex(e.target.value)}
                            placeholder="#2563EB"
                            className="w-24 px-2 py-1 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 uppercase focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Swatches */}
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Pilihan Cepat Warna (Quick Swatches):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {QUICK_COLOR_SWATCHES.map((swatch) => (
                          <button
                            type="button"
                            key={swatch}
                            onClick={() => setCustomHex(swatch)}
                            style={{ backgroundColor: swatch }}
                            className={`w-6 h-6 rounded-md transition-transform cursor-pointer shadow-2xs flex items-center justify-center ${
                              customHex.toLowerCase() === swatch.toLowerCase()
                                ? 'scale-110 ring-2 ring-offset-1 ring-indigo-600'
                                : 'hover:scale-105'
                            }`}
                            title={swatch}
                          >
                            {customHex.toLowerCase() === swatch.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                <div>
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] block">
                    Pratinjau Tampilan Label di Kalender:
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    Warna Terpilih: <strong>{activeHex}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: activeHex, color: '#ffffff' }}
                    className="text-xs font-bold px-2.5 py-1 rounded shadow-xs tracking-wider"
                  >
                    [{inisial || 'KODE'}] Contoh Kegiatan Dinas
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs cursor-pointer"
                >
                  Simpan Bidang
                </button>
              </div>
            </form>
          )}

          {/* List of Departments */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-800/80 shadow-2xs">
            {departments.map((dept) => {
              const tripCount = allTrips.filter(t => t.bidangId === dept.id).length;

              return (
                <div key={dept.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <div className="flex items-center gap-3">
                    <span
                      style={getDeptBadgeStyle(dept)}
                      className={`text-xs font-bold px-2.5 py-1 rounded shadow-2xs tracking-wider shrink-0 ${
                        dept.color.badgeBg
                      }`}
                    >
                      [{dept.inisial}]
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white">{dept.nama}</p>
                        {dept.color.hexColor && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {dept.color.hexColor}
                          </span>
                        )}
                      </div>
                      {dept.deskripsi && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{dept.deskripsi}</p>
                      )}
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                        {tripCount} Perintah Perjalanan Dinas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-colors cursor-pointer"
                      title="Ubah bidang & warna"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                      title="Hapus bidang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
