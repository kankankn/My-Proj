import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  Building2, 
  Car, 
  FileText, 
  Edit3, 
  Trash2, 
  Printer, 
  CreditCard,
  FileDown
} from 'lucide-react';
import { BusinessTrip, Department, Employee } from '../../types/trip';
import { formatDateRange, calculateDurationDays } from '../../utils/dateUtils';
import { generateSingleTripPDF } from '../../utils/pdfExportUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface TripDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: BusinessTrip | null;
  departments: Department[];
  employees: Employee[];
  onEdit: (trip: BusinessTrip) => void;
  onDelete: (tripId: string) => void;
  canModify?: boolean;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  isOpen,
  onClose,
  trip,
  departments,
  employees,
  onEdit,
  onDelete,
  canModify = true,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !trip) return null;

  const dept = departments.find(d => d.id === trip.bidangId);
  const empsMap = new Map(employees.map(e => [e.id, e]));
  const assignedEmployees = trip.karyawanIds
    .map(id => empsMap.get(id))
    .filter(Boolean) as Employee[];

  const duration = calculateDurationDays(trip.tanggalMulai, trip.tanggalSelesai);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      setIsExportingPdf(true);
      generateSingleTripPDF(trip, departments, employees);
    } catch (err) {
      console.error('Error generating single trip PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data perjalanan dinas: "${trip.namaKegiatan}"?`)) {
      onDelete(trip.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              style={getDeptBadgeStyle(dept)}
              className={`text-xs font-bold px-2 py-0.5 rounded tracking-wide ${
                dept?.color?.badgeBg || 'bg-slate-700 text-white'
              }`}
            >
              [{dept?.inisial || 'DINAS'}]
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {dept?.nama || 'Bidang Pemberi Perintah'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800 dark:text-slate-100">
          
          {/* Main Title & Surat Tugas */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
              <FileText className="w-3.5 h-3.5" />
              <span>No. Surat: {trip.nomorSurat}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {trip.namaKegiatan}
            </h3>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Jadwal Pelaksanaan:
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {formatDateRange(trip.tanggalMulai, trip.tanggalSelesai)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Lama perjalanan: {duration} Hari Kerja
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                Lokasi / Tujuan:
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {trip.tujuan}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Moda Transportasi:
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {trip.transportasi || 'Kendaraan Dinas'}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Beban Anggaran:
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {trip.biayaAnggaran || 'DIPA Satuan Kerja'}
              </p>
            </div>
          </div>

          {/* Assigned Staff List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Pegawai Pelaksana ({assignedEmployees.length} Orang)</span>
            </h4>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-800/40">
              {assignedEmployees.map((emp, index) => (
                <div key={emp.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white">{emp.nama}</p>
                        {emp.pangkatGol && (
                          <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded">
                            {emp.pangkatGol}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${getAsnBadgeClass(emp.statusAsn)}`}>
                          {emp.statusAsn || 'PNS'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{emp.jabatan}</span> • <span className="font-mono text-slate-500 dark:text-slate-400">{emp.nip ? `NIP. ${emp.nip}` : 'Non-NIP'}</span>
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    Bebas Bentrok
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan / Keterangan */}
          {trip.keterangan && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Catatan / Keterangan Tambahan
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-line">
                {trip.keterangan}
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {canModify ? (
            <button
              onClick={handleDeleteConfirm}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus SPPD</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Mode baca · SPPD milik bidang {dept?.inisial || 'lain'}
            </span>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Cetak Bukti (Pertama) */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Bukti</span>
            </button>

            {/* Download PDF button (di sebelahnya / di bawahnya jika sempit) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Unduh dokumen SPPD resmi berformat PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF (.pdf)'}</span>
            </button>

            {canModify && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(trip);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Ubah Jadwal</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
