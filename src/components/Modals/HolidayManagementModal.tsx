import React, { useState, useMemo } from 'react';
import {
  X,
  CalendarOff,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { HolidayEntry, HolidayType } from '../../types/trip';
import { formatIndonesianDate, formatDateKey } from '../../utils/dateUtils';

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: HolidayEntry[];
  initialDate?: string;
  onSaveHoliday: (entry: Omit<HolidayEntry, 'id'>) => void;
  onDeleteHoliday: (id: string) => void;
}

export const HolidayManagementModal: React.FC<HolidayManagementModalProps> = ({
  isOpen,
  onClose,
  holidays,
  initialDate,
  onSaveHoliday,
  onDeleteHoliday,
}) => {
  const [tanggal, setTanggal] = useState(initialDate || formatDateKey(new Date()));
  const [jenis, setJenis] = useState<HolidayType>('Libur Nasional');
  const [keterangan, setKeterangan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(String(new Date().getFullYear()));
    for (const h of holidays) {
      const y = h.tanggal.slice(0, 4);
      if (y) years.add(y);
    }
    return Array.from(years).sort();
  }, [holidays]);

  const filteredHolidays = useMemo(() => {
    return [...holidays]
      .filter((h) => {
        if (filterYear !== 'ALL' && !h.tanggal.startsWith(filterYear)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            h.keterangan.toLowerCase().includes(q) ||
            h.jenis.toLowerCase().includes(q) ||
            h.tanggal.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [holidays, filterYear, searchQuery]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal || !keterangan.trim()) {
      setNotice({ type: 'error', text: 'Tanggal dan keterangan hari libur wajib diisi.' });
      return;
    }

    onSaveHoliday({
      tanggal,
      jenis,
      keterangan: keterangan.trim(),
    });

    setNotice({
      type: 'success',
      text: `Penanda "${keterangan.trim()}" (${formatIndonesianDate(tanggal)}) berhasil disimpan.`,
    });
    setKeterangan('');
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Penanda Tanggal Merah &amp; Cuti Bersama
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Khusus Administrator · Tampil di Kalender, Matriks SPPD, dan peringatan form tugas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {notice && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                notice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {/* Add Holiday Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Tambah / Perbarui Penanda Hari Libur
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tanggal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <select
                  value={jenis}
                  onChange={(e) => setJenis(e.target.value as HolidayType)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 font-medium"
                >
                  <option value="Libur Nasional">Libur Nasional (Tanggal Merah)</option>
                  <option value="Cuti Bersama">Cuti Bersama</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Keterangan Libur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Misal: Hari Kemerdekaan RI"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Penanda Tanggal</span>
              </button>
            </div>
          </form>

          {/* List Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keterangan libur atau tanggal..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-3 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Semua Tahun ({holidays.length})</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Holidays List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {filteredHolidays.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Belum ada penanda tanggal merah / cuti bersama yang ditambahkan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {filteredHolidays.map((h) => (
                  <div
                    key={h.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatIndonesianDate(h.tanggal, true)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            h.jenis === 'Libur Nasional'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {h.jenis}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                        {h.keterangan}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteHoliday(h.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title="Hapus penanda tanggal ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Total {holidays.length} tanggal merah / cuti bersama tersimpan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
