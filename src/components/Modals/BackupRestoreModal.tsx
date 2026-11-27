import React, { useState, useRef } from 'react';
import {
  X,
  DatabaseBackup,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileJson,
} from 'lucide-react';
import {
  ActivityLogEntry,
  BusinessTrip,
  Department,
  Employee,
  HolidayEntry,
} from '../../types/trip';

export interface AppBackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  data: {
    departments: Department[];
    employees: Employee[];
    trips: BusinessTrip[];
    holidays: HolidayEntry[];
    activityLogs: ActivityLogEntry[];
  };
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  employees: Employee[];
  trips: BusinessTrip[];
  holidays: HolidayEntry[];
  activityLogs: ActivityLogEntry[];
  onRestoreBackup: (data: AppBackupPayload['data'], fileName: string) => void;
  onRecordBackup: (fileName: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  departments,
  employees,
  trips,
  holidays,
  activityLogs,
  onRestoreBackup,
  onRecordBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    fileName: string;
    exportedAt?: string;
    data: AppBackupPayload['data'];
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleOneClickBackup = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const fileName = `Backup_Kendali_SPPD_${todayStr}.json`;

    const payload: AppBackupPayload = {
      app: 'KENDALI-SPPD',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        departments,
        employees,
        trips,
        holidays,
        activityLogs,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onRecordBackup(fileName);
    setStatusMessage({
      type: 'success',
      text: `Backup berhasil diunduh (${fileName}). Simpan file ini di tempat aman.`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);

        const source = parsed?.data ? parsed.data : parsed;
        if (
          !source ||
          !Array.isArray(source.departments) ||
          !Array.isArray(source.employees) ||
          !Array.isArray(source.trips)
        ) {
          setPendingRestore(null);
          setStatusMessage({
            type: 'error',
            text: 'Format file backup tidak valid. Pastikan memilih file JSON hasil Backup Kendali SPPD.',
          });
          return;
        }

        setPendingRestore({
          fileName: file.name,
          exportedAt: parsed?.exportedAt,
          data: {
            departments: source.departments,
            employees: source.employees,
            trips: source.trips,
            holidays: Array.isArray(source.holidays) ? source.holidays : [],
            activityLogs: Array.isArray(source.activityLogs) ? source.activityLogs : [],
          },
        });
      } catch {
        setPendingRestore(null);
        setStatusMessage({
          type: 'error',
          text: 'Gagal membaca file JSON backup. File mungkin rusak atau bukan JSON valid.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    onRestoreBackup(pendingRestore.data, pendingRestore.fileName);
    setStatusMessage({
      type: 'success',
      text: `Seluruh data berhasil dipulihkan dari "${pendingRestore.fileName}".`,
    });
    setPendingRestore(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <DatabaseBackup className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Backup &amp; Restore Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadangkan atau pulihkan seluruh data aplikasi dalam satu berkas (.json)
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

        <div className="p-6 space-y-5">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Current Data Summary */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Ringkasan Data Tersimpan Saat Ini
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              {[
                { label: 'Bidang', count: departments.length },
                { label: 'Pegawai', count: employees.length },
                { label: 'SPPD', count: trips.length },
                { label: 'Tgl Merah', count: holidays.length },
                { label: 'Log', count: activityLogs.length },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {item.count}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1-Click Backup Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Backup Data (Satu Klik)
              </h4>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Mengunduh salinan lengkap seluruh Bidang, Pegawai, SPPD, Tanggal Merah, dan Log Aktivitas.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOneClickBackup}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Backup</span>
            </button>
          </div>

          {/* Restore Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Restore Data dari File Backup
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih file <span className="font-mono">.json</span> hasil backup untuk memulihkan data aplikasi.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Pilih File JSON</span>
              </button>
            </div>

            {pendingRestore && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold flex items-center gap-1.5 truncate">
                      <FileJson className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{pendingRestore.fileName}</span>
                    </div>
                    <p className="text-[11px] mt-0.5">
                      Isi file: <strong>{pendingRestore.data.departments.length}</strong> Bidang ·{' '}
                      <strong>{pendingRestore.data.employees.length}</strong> Pegawai ·{' '}
                      <strong>{pendingRestore.data.trips.length}</strong> SPPD ·{' '}
                      <strong>{pendingRestore.data.holidays.length}</strong> Tgl Merah ·{' '}
                      <strong>{pendingRestore.data.activityLogs.length}</strong> Log.
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                      Pemulihan akan mengganti data aplikasi saat ini dengan isi file backup tersebut.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingRestore(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    Pulihkan Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
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
