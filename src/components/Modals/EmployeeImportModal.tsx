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
  Check 
} from 'lucide-react';
import { Employee, Department } from '../../types/trip';
import { 
  parseEmployeeExcelFile, 
  downloadEmployeeTemplate, 
  ParsedEmployeeRow 
} from '../../utils/excelEmployeeUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  existingEmployees: Employee[];
  onImportSuccess: (importedEmployees: Employee[], message: string) => void;
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  departments,
  existingEmployees,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'update' | 'skip' | 'add'>('update');

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

    try {
      const rows = await parseEmployeeExcelFile(file, departments, existingEmployees);
      if (rows.length === 0) {
        setErrorMessage('File Excel kosong atau tidak menemukan data pegawai yang dapat dibaca.');
        setParsedRows([]);
      } else {
        setParsedRows(rows);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal membaca file Excel. Pastikan format file .xlsx atau .xls valid.'
      );
      setParsedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowBidangChange = (tempId: string, newBidangId: string) => {
    setParsedRows(prev => prev.map(row => {
      if (row.tempId === tempId) {
        return {
          ...row,
          bidangId: newBidangId,
          errors: row.errors.filter(e => !e.includes('Bidang'))
        };
      }
      return row;
    }));
  };

  const handleRemoveRow = (tempId: string) => {
    setParsedRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleExecuteImport = () => {
    // Filter valid rows
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMessage('Tidak ada data pegawai valid yang dapat diimpor.');
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const newEmployeesMap = new Map<string, Employee>();
    // Seed with existing employees
    existingEmployees.forEach(e => newEmployeesMap.set(e.id, { ...e }));

    // Map clean NIP to existing ID
    const nipToIdMap = new Map<string, string>();
    existingEmployees.forEach(e => {
      const c = e.nip.replace(/\s+/g, '');
      if (c && c !== '-') nipToIdMap.set(c, e.id);
    });

    for (const row of validRows) {
      const cleanNip = row.nip.replace(/\s+/g, '');
      const existingId = cleanNip && cleanNip !== '-' ? nipToIdMap.get(cleanNip) : undefined;

      if (existingId) {
        if (duplicateAction === 'update') {
          // Update existing
          const current = newEmployeesMap.get(existingId);
          if (current) {
            newEmployeesMap.set(existingId, {
              ...current,
              nama: row.nama,
              nip: row.nip,
              pangkatGol: row.pangkatGol || current.pangkatGol || '',
              jabatan: row.jabatan,
              bidangId: row.bidangId,
              statusAsn: row.statusAsn || current.statusAsn || 'PNS',
            });
            updatedCount++;
          }
        } else if (duplicateAction === 'skip') {
          skippedCount++;
        } else if (duplicateAction === 'add') {
          const newId = `emp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          newEmployeesMap.set(newId, {
            id: newId,
            nama: row.nama,
            nip: row.nip,
            pangkatGol: row.pangkatGol || '',
            jabatan: row.jabatan,
            bidangId: row.bidangId,
            statusAsn: row.statusAsn || 'PNS',
          });
          addedCount++;
        }
      } else {
        // Brand new employee
        const newId = `emp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        newEmployeesMap.set(newId, {
          id: newId,
          nama: row.nama,
          nip: row.nip,
          pangkatGol: row.pangkatGol || '',
          jabatan: row.jabatan,
          bidangId: row.bidangId,
          statusAsn: row.statusAsn || 'PNS',
        });
        addedCount++;
        if (cleanNip && cleanNip !== '-') nipToIdMap.set(cleanNip, newId);
      }
    }

    const finalList = Array.from(newEmployeesMap.values());
    const summaryMsg = `Berhasil mengimpor: ${addedCount} pegawai baru ditambahkan` + 
      (updatedCount > 0 ? `, ${updatedCount} pegawai diperbarui` : '') +
      (skippedCount > 0 ? `, ${skippedCount} data duplikat dilewati` : '') + '.';

    onImportSuccess(finalList, summaryMsg);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const validCount = parsedRows.filter(r => r.isValid).length;
  const existingCount = parsedRows.filter(r => r.isValid && r.isExisting).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Impor Data Pegawai dari Excel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mendukung format .xlsx, .xls, dan .csv dengan pemetaan kolom otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadEmployeeTemplate(departments)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="Unduh file format excel siap isi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: Upload Dropzone if no file selected or table is empty */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-300 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs transition-colors">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h4 className="text-sm font-bold text-slate-800 mb-1">
                {isLoading ? 'Sedang Memproses File Excel...' : 'Klik untuk Pilih File atau Seret File ke Sini'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Pilih file dokumen Excel (.xlsx / .xls) yang berisi kolom Nama Lengkap, NIP, Jabatan, dan Bidang/Inisial.
              </p>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span>Contoh Format Kolom:</span>
                <span className="font-mono text-[11px] text-emerald-700 font-bold">
                  Nama | NIP | Jabatan | Bidang
                </span>
              </div>
            </div>
          ) : (
            /* STEP 2: Preview & Validation Table */
            <div className="space-y-4">
              
              {/* Summary Badges & File Name */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {selectedFile?.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({parsedRows.length} baris data)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    ✓ {validCount} Siap Diimpor
                  </span>
                  {existingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                      ⚡ {existingCount} NIP Sudah Ada
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[11px]">
                      ✕ {invalidCount} Data Tidak Lengkap
                    </span>
                  )}
                  <button
                    onClick={handleReset}
                    className="ml-2 text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              </div>

              {/* Duplicate Handling Option if any existing NIP detected */}
              {existingCount > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Opsi Penanganan NIP yang Sudah Terdaftar ({existingCount} Pegawai):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                      duplicateAction === 'update' 
                        ? 'bg-white border-amber-400 ring-2 ring-amber-200/50 text-slate-900' 
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="dupAction"
                        checked={duplicateAction === 'update'}
                        onChange={() => setDuplicateAction('update')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <p className="font-bold text-[11px]">Perbarui Data (Update)</p>
                        <p className="text-[10px] text-slate-500">Perbarui nama, jabatan, bidang untuk NIP yang sama.</p>
                      </div>
                    </label>

                    <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                      duplicateAction === 'skip' 
                        ? 'bg-white border-amber-400 ring-2 ring-amber-200/50 text-slate-900' 
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="dupAction"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <p className="font-bold text-[11px]">Lewati / Skip Duplikat</p>
                        <p className="text-[10px] text-slate-500">Pertahankan data lama di sistem, jangan ubah.</p>
                      </div>
                    </label>

                    <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                      duplicateAction === 'add' 
                        ? 'bg-white border-amber-400 ring-2 ring-amber-200/50 text-slate-900' 
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="dupAction"
                        checked={duplicateAction === 'add'}
                        onChange={() => setDuplicateAction('add')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <p className="font-bold text-[11px]">Tambahkan Duplikat Baru</p>
                        <p className="text-[10px] text-slate-500">Tetap buat entri baru walaupun NIP sama.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Parsed Rows Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 select-none">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Nama Pegawai</th>
                        <th className="py-2.5 px-3">NIP</th>
                        <th className="py-2.5 px-3">Pangkat/Gol</th>
                        <th className="py-2.5 px-3">Jabatan</th>
                        <th className="py-2.5 px-3">Unit / Bidang</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-2 text-center w-8">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.map((row, idx) => (
                        <tr 
                          key={row.tempId} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !row.isValid 
                              ? 'bg-rose-50/30' 
                              : row.isExisting 
                              ? 'bg-amber-50/20' 
                              : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {row.nama || (
                              <span className="text-rose-500 italic">Kosong *</span>
                            )}
                          </td>

                          <td className="py-2 px-3 font-mono text-slate-700 text-[11px]">
                            {row.nip || (
                              <span className="text-rose-500 italic">Kosong *</span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-slate-700 text-[11px]">
                            {row.pangkatGol || (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-slate-700">
                            {row.jabatan || (
                              <span className="text-rose-500 italic">Kosong *</span>
                            )}
                          </td>

                          {/* Bidang Dropdown selector */}
                          <td className="py-2 px-3">
                            <select
                              value={row.bidangId}
                              onChange={(e) => handleRowBidangChange(row.tempId, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500"
                            >
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                  [{dept.inisial}] {dept.nama}
                                </option>
                              ))}
                            </select>
                            {row.rawBidang && (
                              <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-44">
                                Dari file: {row.rawBidang}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {!row.isValid ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                {row.errors[0] || 'Tidak Lengkap'}
                              </span>
                            ) : row.isExisting ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                NIP Terdaftar
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Siap Impor
                              </span>
                            )}
                          </td>

                          {/* Remove row */}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleRemoveRow(row.tempId)}
                              title="Hapus baris ini dari daftar impor"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {parsedRows.length > 0 && `Total: ${validCount} pegawai valid akan diproses ke sistem.`}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            {parsedRows.length > 0 && (
              <button
                onClick={handleExecuteImport}
                disabled={validCount === 0}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                  validCount === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Simpan {validCount} Pegawai ke Sistem</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
