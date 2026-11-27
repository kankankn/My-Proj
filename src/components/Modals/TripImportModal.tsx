import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Trash2,
  Check,
  Users,
  Calendar,
  MapPin
} from 'lucide-react';
import { BusinessTrip, Department, Employee } from '../../types/trip';
import {
  parseTripExcelFile,
  downloadTripTemplateExcel,
  ParsedTripRow
} from '../../utils/excelTripUtils';
import { checkTripConflicts, formatDateRange } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';

interface TripImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  employees: Employee[];
  existingTrips: BusinessTrip[];
  lockedBidangId?: string;
  onImportSuccess: (updatedTrips: BusinessTrip[], message: string, targetDate?: Date) => void;
}

export const TripImportModal: React.FC<TripImportModalProps> = ({
  isOpen,
  onClose,
  departments,
  employees,
  existingTrips,
  lockedBidangId,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedTripRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'update' | 'skip' | 'add'>('update');
  const [editingPelaksanaRowId, setEditingPelaksanaRowId] = useState<string | null>(null);

  const employeesMap = new Map(employees.map(e => [e.id, e]));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    setErrorMessage(null);
    setEditingPelaksanaRowId(null);

    try {
      const rows = await parseTripExcelFile(file, departments, employees, existingTrips);
      if (rows.length === 0) {
        setErrorMessage('File Excel kosong atau tidak menemukan baris data SPPD yang valid.');
        setParsedRows([]);
      } else {
        const normalizedRows = lockedBidangId
          ? rows.map((row) => ({
              ...row,
              bidangId: lockedBidangId,
              warnings: row.warnings.filter((w) => !w.includes('Bidang')),
            }))
          : rows;
        setParsedRows(normalizedRows);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Gagal membaca file Excel. Pastikan format file .xlsx, .xls, atau .csv valid.'
      );
      setParsedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowBidangChange = (tempId: string, newBidangId: string) => {
    if (lockedBidangId) return;
    setParsedRows(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;
        const warnings = row.warnings.filter(w => !w.includes('Bidang'));
        return { ...row, bidangId: newBidangId, warnings };
      })
    );
  };

  const handleToggleEmployeeInRow = (tempId: string, empId: string) => {
    setParsedRows(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;
        const exists = row.karyawanIds.includes(empId);
        const nextIds = exists
          ? row.karyawanIds.filter(id => id !== empId)
          : [...row.karyawanIds, empId];

        const nextErrors = row.errors.filter(e => !e.includes('pelaksana'));
        if (nextIds.length === 0) {
          nextErrors.push('Belum ada pegawai pelaksana terdaftar yang cocok');
        }

        const nextConflicts =
          row.tanggalMulai && row.tanggalSelesai && nextIds.length > 0
            ? checkTripConflicts(
                nextIds,
                row.tanggalMulai,
                row.tanggalSelesai,
                existingTrips,
                employees,
                departments,
                row.existingId
              )
            : [];

        const nextWarnings = row.warnings.filter(w => !w.includes('bentrok'));
        if (nextConflicts.length > 0) {
          nextWarnings.push(`${nextConflicts.length} potensi bentrok jadwal dengan SPPD yang ada`);
        }

        return {
          ...row,
          karyawanIds: nextIds,
          errors: nextErrors,
          warnings: nextWarnings,
          conflicts: nextConflicts,
          isValid: nextErrors.length === 0,
        };
      })
    );
  };

  const handleRemoveRow = (tempId: string) => {
    setParsedRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleExecuteImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMessage('Tidak ada data SPPD yang valid untuk disimpan ke database.');
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const tripsMap = new Map<string, BusinessTrip>();
    existingTrips.forEach(t => tripsMap.set(t.id, { ...t }));

    const suratToIdMap = new Map<string, string>();
    existingTrips.forEach(t => {
      const cleanSurat = t.nomorSurat.trim().toLowerCase();
      if (cleanSurat && cleanSurat !== '-') {
        suratToIdMap.set(cleanSurat, t.id);
      }
    });

    let firstImportedDate: Date | undefined;

    for (const row of validRows) {
      const effectiveBidangId = lockedBidangId || row.bidangId;
      const cleanSurat = row.nomorSurat.trim().toLowerCase();
      const matchedId =
        (row.existingId && tripsMap.has(row.existingId) ? row.existingId : undefined) ||
        (cleanSurat && cleanSurat !== '-' ? suratToIdMap.get(cleanSurat) : undefined);

      if (!firstImportedDate && row.tanggalMulai) {
        const [y, m, d] = row.tanggalMulai.split('-').map(Number);
        if (y && m && d) {
          firstImportedDate = new Date(y, m - 1, d);
        }
      }

      if (matchedId) {
        const current = tripsMap.get(matchedId);
        if (lockedBidangId && current && current.bidangId !== lockedBidangId) {
          skippedCount++;
          continue;
        }
        if (duplicateAction === 'update') {
          if (current) {
            tripsMap.set(matchedId, {
              ...current,
              nomorSurat: row.nomorSurat,
              namaKegiatan: row.namaKegiatan,
              bidangId: effectiveBidangId,
              tujuan: row.tujuan,
              tanggalMulai: row.tanggalMulai,
              tanggalSelesai: row.tanggalSelesai,
              karyawanIds: row.karyawanIds,
              transportasi: row.transportasi || current.transportasi || 'Kendaraan Dinas',
              biayaAnggaran: row.biayaAnggaran || current.biayaAnggaran,
              keterangan: row.keterangan || '',
            });
            updatedCount++;
          }
        } else if (duplicateAction === 'skip') {
          skippedCount++;
        } else if (duplicateAction === 'add') {
          const newId = `trip-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
          tripsMap.set(newId, {
            id: newId,
            nomorSurat: row.nomorSurat,
            namaKegiatan: row.namaKegiatan,
            bidangId: effectiveBidangId,
            tujuan: row.tujuan,
            tanggalMulai: row.tanggalMulai,
            tanggalSelesai: row.tanggalSelesai,
            karyawanIds: row.karyawanIds,
            transportasi: row.transportasi || 'Kendaraan Dinas',
            biayaAnggaran: row.biayaAnggaran,
            keterangan: row.keterangan || '',
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      } else {
        const newId = `trip-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        tripsMap.set(newId, {
          id: newId,
          nomorSurat: row.nomorSurat,
          namaKegiatan: row.namaKegiatan,
          bidangId: effectiveBidangId,
          tujuan: row.tujuan,
          tanggalMulai: row.tanggalMulai,
          tanggalSelesai: row.tanggalSelesai,
          karyawanIds: row.karyawanIds,
          transportasi: row.transportasi || 'Kendaraan Dinas',
          biayaAnggaran: row.biayaAnggaran,
          keterangan: row.keterangan || '',
          createdAt: new Date().toISOString(),
        });
        addedCount++;
        if (cleanSurat && cleanSurat !== '-') {
          suratToIdMap.set(cleanSurat, newId);
        }
      }
    }

    const finalTrips = Array.from(tripsMap.values());
    const msgParts: string[] = [];
    if (addedCount > 0) msgParts.push(`${addedCount} SPPD baru ditambahkan`);
    if (updatedCount > 0) msgParts.push(`${updatedCount} SPPD diperbarui`);
    if (skippedCount > 0) msgParts.push(`${skippedCount} data duplikat dilewati`);

    const summaryMsg =
      msgParts.length > 0
        ? `Berhasil mengimpor ke database: ${msgParts.join(', ')}.`
        : 'Tidak ada perubahan data SPPD.';

    onImportSuccess(finalTrips, summaryMsg, firstImportedDate);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrorMessage(null);
    setEditingPelaksanaRowId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const validCount = parsedRows.filter(r => r.isValid).length;
  const existingCount = parsedRows.filter(r => r.isValid && r.isExisting).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const conflictCount = parsedRows.filter(r => r.isValid && r.conflicts.length > 0).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Impor Data SPPD dari Excel ke Database
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unggah file Excel hasil ekspor atau template SPPD (.xlsx, .xls, .csv)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadTripTemplateExcel(departments, employees)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="Unduh template format Excel siap isi lengkap dengan daftar pegawai & bidang"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {parsedRows.length === 0 ? (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 rounded-2xl p-10 text-center transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />

              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {isLoading ? 'Sedang Membaca File Excel...' : 'Klik atau Seret File Excel SPPD ke Sini'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-4 leading-relaxed">
                Mendukung file hasil <strong>Ekspor Excel</strong> dari Matriks SPPD maupun file{' '}
                <strong>Template Excel SPPD</strong> (.xlsx, .xls, .csv). Pegawai pelaksana otomatis
                dicocokkan berdasarkan NIP atau kemiripan Nama.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xs group-hover:bg-emerald-700 transition-colors">
                <span>Pilih File Excel</span>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kolom Wajib:</strong> Nama Kegiatan, Tujuan, Tanggal Mulai, Pelaksana.
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Banyak Pelaksana:</strong> Pisahkan dengan titik koma (<code>;</code>) atau baris baru.
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sinkronisasi Database:</strong> Mendukung update data lama atau tambah baru.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info & Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedFile?.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ditemukan {parsedRows.length} baris SPPD •{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">{validCount} valid</strong>
                      {existingCount > 0 && (
                        <>
                          {' '}
                          •{' '}
                          <strong className="text-amber-700 dark:text-amber-400">
                            {existingCount} sudah ada di database
                          </strong>
                        </>
                      )}
                      {conflictCount > 0 && (
                        <>
                          {' '}
                          •{' '}
                          <strong className="text-orange-600 dark:text-orange-400">
                            {conflictCount} potensi bentrok
                          </strong>
                        </>
                      )}
                      {invalidCount > 0 && (
                        <>
                          {' '}
                          •{' '}
                          <strong className="text-rose-600 dark:text-rose-400">
                            {invalidCount} perlu dilengkapi
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ganti File</span>
                </button>
              </div>

              {/* Duplicate Action Options */}
              {existingCount > 0 && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Terdapat {existingCount} SPPD yang ID Sistem atau Nomor Suratnya sudah tersimpan di database:
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        duplicateAction === 'update'
                          ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-2xs ring-1 ring-amber-500'
                          : 'bg-white/60 dark:bg-slate-800/40 border-amber-200/70 dark:border-amber-800/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tripDupAction"
                        checked={duplicateAction === 'update'}
                        onChange={() => setDuplicateAction('update')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <p className="font-bold text-[11px]">Perbarui Data Lama</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Timpa data SPPD di database dengan versi Excel terbaru.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        duplicateAction === 'skip'
                          ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-2xs ring-1 ring-amber-500'
                          : 'bg-white/60 dark:bg-slate-800/40 border-amber-200/70 dark:border-amber-800/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tripDupAction"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <p className="font-bold text-[11px]">Lewati Duplikat</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Pertahankan data database yang sudah ada, hanya tambah yang baru.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        duplicateAction === 'add'
                          ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-2xs ring-1 ring-amber-500'
                          : 'bg-white/60 dark:bg-slate-800/40 border-amber-200/70 dark:border-amber-800/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tripDupAction"
                        checked={duplicateAction === 'add'}
                        onChange={() => setDuplicateAction('add')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <p className="font-bold text-[11px]">Tambah Sebagai Entri Baru</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Buat salinan SPPD baru di database meskipun Nomor Surat sama.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 select-none">
                      <tr>
                        <th className="py-2.5 px-2.5 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Nomor Surat & Kegiatan</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Bidang</th>
                        <th className="py-2.5 px-3 min-w-[155px]">Tujuan & Tanggal</th>
                        <th className="py-2.5 px-3 min-w-[220px]">Pelaksana Terdeteksi</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Status Validasi</th>
                        <th className="py-2.5 px-2 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {parsedRows.map((row, idx) => {
                        const dept = departments.find(d => d.id === row.bidangId);
                        const isEditingEmp = editingPelaksanaRowId === row.tempId;

                        return (
                          <React.Fragment key={row.tempId}>
                            <tr
                              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                                !row.isValid
                                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                                  : row.conflicts.length > 0
                                  ? 'bg-orange-50/30 dark:bg-orange-950/15'
                                  : row.isExisting
                                  ? 'bg-amber-50/20 dark:bg-amber-950/10'
                                  : ''
                              }`}
                            >
                              <td className="py-2.5 px-2.5 text-center text-slate-500 font-mono text-[11px] align-top">
                                {idx + 1}
                              </td>

                              <td className="py-2.5 px-3 align-top">
                                <div className="font-mono text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold">
                                  {row.nomorSurat}
                                </div>
                                <div className="font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
                                  {row.namaKegiatan || (
                                    <span className="text-rose-500 italic">Kegiatan Kosong *</span>
                                  )}
                                </div>
                                {(row.transportasi || row.biayaAnggaran) && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {row.transportasi} • Anggaran {row.biayaAnggaran}
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 align-top">
                                <select
                                  disabled={Boolean(lockedBidangId)}
                                  value={lockedBidangId || row.bidangId}
                                  onChange={e => handleRowBidangChange(row.tempId, e.target.value)}
                                  className={`w-full text-[11px] border rounded px-2 py-1 font-medium focus:ring-1 focus:ring-emerald-500 ${
                                    lockedBidangId
                                      ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {departments.map(d => (
                                    <option key={d.id} value={d.id}>
                                      [{d.inisial}] {d.nama}
                                    </option>
                                  ))}
                                </select>
                                {dept && (
                                  <span
                                    style={getDeptBadgeStyle(dept)}
                                    className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded border"
                                  >
                                    {dept.inisial}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 align-top">
                                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>{row.tujuan || <em className="text-rose-500">Kosong *</em>}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                  <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                  {row.tanggalMulai ? (
                                    <span>{formatDateRange(row.tanggalMulai, row.tanggalSelesai)}</span>
                                  ) : (
                                    <span className="text-rose-500 italic">Tanggal Tidak Valid *</span>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 align-top">
                                <div className="flex flex-wrap gap-1">
                                  {row.karyawanIds.map(eid => {
                                    const emp = employeesMap.get(eid);
                                    return (
                                      <span
                                        key={eid}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-[10px] font-medium"
                                      >
                                        <span>{emp?.nama || eid}</span>
                                      </span>
                                    );
                                  })}
                                  {row.karyawanIds.length === 0 && (
                                    <span className="text-rose-500 italic text-[11px]">
                                      Belum ada pegawai cocok
                                    </span>
                                  )}
                                </div>

                                {row.unmatchedPelaksana.length > 0 && (
                                  <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                                    Tidak ditemukan: {row.unmatchedPelaksana.join(', ')}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPelaksanaRowId(isEditingEmp ? null : row.tempId)
                                  }
                                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{isEditingEmp ? 'Tutup Pilihan Pegawai' : 'Ubah / Pilih Pelaksana'}</span>
                                </button>
                              </td>

                              <td className="py-2.5 px-3 align-top">
                                {!row.isValid ? (
                                  <div className="space-y-0.5 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                                    {row.errors.map((err, i) => (
                                      <div key={i}>• {err}</div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {row.isExisting ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                        Duplikat DB
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                        <CheckCircle2 className="w-3 h-3" /> Siap Impor
                                      </span>
                                    )}
                                    {row.conflicts.length > 0 && (
                                      <div className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">
                                        ⚠ {row.conflicts[0].employeeName} bentrok ({row.conflicts[0].conflictingDate})
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-2 text-center align-top">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.tempId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                  title="Hapus baris ini dari daftar impor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>

                            {/* Inline Employee Picker Row */}
                            {isEditingEmp && (
                              <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                                <td colSpan={7} className="p-3 border-b border-indigo-200 dark:border-indigo-800">
                                  <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center justify-between">
                                    <span>Pilih Pegawai Pelaksana untuk &quot;{row.namaKegiatan}&quot;:</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPelaksanaRowId(null)}
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                      Selesai
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                                    {employees.map(emp => {
                                      const checked = row.karyawanIds.includes(emp.id);
                                      return (
                                        <label
                                          key={emp.id}
                                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                                            checked
                                              ? 'bg-indigo-100/80 dark:bg-indigo-900/50 border-indigo-400 text-indigo-950 dark:text-white font-semibold'
                                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleToggleEmployeeInRow(row.tempId, emp.id)}
                                            className="rounded-sm text-indigo-600"
                                          />
                                          <span className="truncate">{emp.nama}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {parsedRows.length > 0 ? (
              <span>
                Siap disimpan ke database:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">{validCount} data SPPD</strong>
              </span>
            ) : (
              <span>Format didukung: .xlsx, .xls, .csv</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                disabled={validCount === 0}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan ke Database ({validCount} SPPD)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
