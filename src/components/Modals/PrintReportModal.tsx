import React, { useState, useMemo } from 'react';
import { X, Printer, FileDown, Filter, CheckCircle2, UserCheck } from 'lucide-react';
import { BusinessTrip, Department, Employee } from '../../types/trip';
import { formatIndonesianDate, NAMA_BULAN, getDatesBetween } from '../../utils/dateUtils';
import { generateRecapPDF } from '../../utils/pdfExportUtils';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  trips,
  departments,
  employees,
}) => {
  const [selectedBidangFilter, setSelectedBidangFilter] = useState<string>('ALL');
  const [selectedAsnFilter, setSelectedAsnFilter] = useState<string>('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Penandatangan State
  const [selectedSignerEmpId, setSelectedSignerEmpId] = useState<string>('');
  const [signerJabatan, setSignerJabatan] = useState<string>('Pejabat Pembina Kepegawaian');
  const [signerNama, setSignerNama] = useState<string>('');
  const [signerNip, setSignerNip] = useState<string>('');

  const sortedSignerOptions = useMemo(() => {
    return [...employees].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [employees]);

  const deptsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  const empsMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Trips in this month
  const rawMonthTrips = useMemo(() => {
    return trips.filter(trip => {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      return dates.some(d => {
        const [y, m] = d.split('-').map(Number);
        return y === currentYear && m === currentMonth + 1;
      });
    }).sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
  }, [trips, currentYear, currentMonth]);

  const monthTrips = useMemo(() => {
    return rawMonthTrips.filter(t => {
      if (selectedBidangFilter !== 'ALL' && t.bidangId !== selectedBidangFilter) {
        return false;
      }
      if (selectedAsnFilter !== 'ALL') {
        const hasMatchingEmp = t.karyawanIds.some(id => {
          const emp = empsMap.get(id);
          return (emp?.statusAsn || 'PNS') === selectedAsnFilter;
        });
        if (!hasMatchingEmp) return false;
      }
      return true;
    });
  }, [rawMonthTrips, selectedBidangFilter, selectedAsnFilter, empsMap]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      setIsExportingPdf(true);
      const activeDept = selectedBidangFilter !== 'ALL' ? deptsMap.get(selectedBidangFilter) : undefined;
      const filterLabel = [
        activeDept ? `Bidang: [${activeDept.inisial}] ${activeDept.nama}` : '',
        selectedAsnFilter !== 'ALL' ? `Status ASN: ${selectedAsnFilter}` : ''
      ].filter(Boolean).join(' • ');

      generateRecapPDF({
        trips: monthTrips,
        departments,
        employees,
        currentDate,
        selectedBidangName: filterLabel || undefined,
        signerJabatan: signerJabatan.trim() || undefined,
        signerNama: signerNama.trim() || undefined,
        signerNip: signerNip.trim() || undefined,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSelectSigner = (empId: string) => {
    setSelectedSignerEmpId(empId);
    if (!empId) {
      setSignerJabatan('Pejabat Pembina Kepegawaian');
      setSignerNama('');
      setSignerNip('');
      return;
    }
    const emp = empsMap.get(empId);
    if (emp) {
      setSignerJabatan(emp.jabatan || 'Pejabat Pembina Kepegawaian');
      setSignerNama(emp.nama);
      setSignerNip(emp.nip || '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Header (Hidden in print) */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rekapitulasi & Cetak Perjalanan Dinas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih format cetak langsung atau unduh dokumen PDF resmi
              </p>
            </div>
          </div>

          {/* Action buttons & Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Bidang */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedBidangFilter}
                onChange={(e) => setSelectedBidangFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">Semua Bidang ({rawMonthTrips.length} kegiatan)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.inisial}] {d.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status ASN */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedAsnFilter}
                onChange={(e) => setSelectedAsnFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
              >
                <option value="ALL">Semua Status Pegawai</option>
                <option value="PNS">Status: PNS</option>
                <option value="PPPK">Status: PPPK</option>
                <option value="PPPK PW">Status: PPPK PW</option>
                <option value="Non ASN/Lainnya">Status: Non ASN/Lainnya</option>
              </select>
            </div>

            {/* Tombol Cetak Sekarang (Pertama) & Unduh PDF (di sebelahnya, di bawahnya jika layout tidak muat) */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              {/* OPSI 1: CETAK SEKARANG (PRINT / BROWSER PDF) */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Buka dialog cetak browser untuk cetak printer fisik atau Simpan PDF browser"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Sekarang (Print)</span>
              </button>

              {/* OPSI 2: UNDUH PDF (DI SEBELAHNYA / DI BAWAHNYA JIKA TIDAK MUAT) */}
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Unduh dokumen rekap berformat PDF siap cetak / arsip resmi"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF (.pdf)'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pengaturan Penandatangan (TTD) - Hidden in print */}
        <div className="px-6 py-2.5 bg-slate-100/80 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Penandatangan (ASN):</span>
            </span>
            <select
              value={selectedSignerEmpId}
              onChange={(e) => handleSelectSigner(e.target.value)}
              className="text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-1 px-2.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Pilih ASN Penandatangan --</option>
              {sortedSignerOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.statusAsn || 'PNS'}] {emp.nama} - {emp.jabatan}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-1 sm:flex-initial">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Jabatan:</span>
              <input
                type="text"
                value={signerJabatan}
                onChange={(e) => setSignerJabatan(e.target.value)}
                placeholder="Jabatan"
                className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 w-40"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Nama:</span>
              <input
                type="text"
                value={signerNama}
                onChange={(e) => setSignerNama(e.target.value)}
                placeholder="Nama Lengkap & Gelar"
                className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 w-40"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">NIP:</span>
              <input
                type="text"
                value={signerNip}
                onChange={(e) => setSignerNip(e.target.value)}
                placeholder="NIP"
                className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 w-36"
              />
            </div>
          </div>
        </div>

        {/* Printable Document Sheet (Always white for accurate document preview & print) */}
        <div className="p-8 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-white text-slate-900">
          
          {/* Header Kop */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h2 className="text-base font-bold tracking-wide uppercase text-slate-900">
              REKAPITULASI SURAT PERINTAH TUGAS & PERJALANAN DINAS
            </h2>
            <h3 className="text-sm font-semibold text-slate-700 uppercase">
              PERIODE: {NAMA_BULAN[currentMonth].toUpperCase()} {currentYear}
              {selectedBidangFilter !== 'ALL' && deptsMap.get(selectedBidangFilter) && (
                <span> • BIDANG [{deptsMap.get(selectedBidangFilter)?.inisial}] {deptsMap.get(selectedBidangFilter)?.nama}</span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sistem Informasi Manajemen Kalender Perjalanan Dinas Pegawai (SIM-SPPD)
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 px-2 py-2 text-center w-10">No</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">No. Surat Tugas</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Bidang Perintah</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Kegiatan / Tugas</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Tujuan & Sarana Transportasi</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Tanggal</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Pegawai Pelaksana</th>
                </tr>
              </thead>
              <tbody>
                {monthTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 p-6 text-center text-slate-500 italic">
                      Tidak ada perjalanan dinas tercatat pada periode ini.
                    </td>
                  </tr>
                ) : (
                  monthTrips.map((trip, idx) => {
                    const dept = deptsMap.get(trip.bidangId);
                    const staff = trip.karyawanIds.map(id => empsMap.get(id)).filter(Boolean) as Employee[];

                    return (
                      <tr key={trip.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 px-2 py-2 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono text-[11px] font-semibold text-slate-900">
                          {trip.nomorSurat}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">
                          <span className="font-bold text-slate-900">[{dept?.inisial || 'DINAS'}]</span>
                          <span className="block text-[10px] text-slate-500">{dept?.nama}</span>
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                          {trip.namaKegiatan}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">
                          <p className="font-semibold text-slate-800">{trip.tujuan}</p>
                          <p className="text-[10px] text-slate-600">Moda: {trip.transportasi || 'Kendaraan Dinas'}</p>
                        </td>
                        <td className="border border-slate-300 px-3 py-2 whitespace-nowrap">
                          {formatIndonesianDate(trip.tanggalMulai)}
                          {trip.tanggalMulai !== trip.tanggalSelesai && (
                            <span className="block text-[10px] text-slate-500">
                              s/d {formatIndonesianDate(trip.tanggalSelesai)}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">
                          <ul className="list-disc list-inside space-y-0.5">
                            {staff.map(emp => (
                              <li key={emp.id} className="text-[11px] text-slate-800 flex items-center gap-1 flex-wrap">
                                <span className="font-semibold">{emp.nama}</span>
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300">
                                  {emp.statusAsn || 'PNS'}
                                </span>
                                {emp.nip && <span className="text-[10px] text-slate-500 font-mono">({emp.nip})</span>}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Signature Footer */}
          <div className="mt-10 pt-6 flex justify-between text-xs text-slate-700 break-inside-avoid">
            <div>
              <p className="font-semibold text-slate-800">Keterangan Dokumen:</p>
              <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                <span>Proteksi Kesalahan Jadwal Harian: Diverifikasi aktif (maksimal 1 penugasan dinas per pegawai/hari).</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                • Dicetak secara otomatis melalui SIM-SPPD pada {formatIndonesianDate(new Date().toISOString().split('T')[0], true)}.
              </p>
            </div>

            <div className="text-center w-72">
              <p>Mengetahui,</p>
              <p className="font-semibold">{signerJabatan || 'Pejabat Pembina Kepegawaian'}</p>
              <div className="h-16"></div>
              <p className="font-bold underline text-slate-900">
                {signerNama ? `( ${signerNama} )` : '( .................................................... )'}
              </p>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                {signerNip ? `NIP. ${signerNip}` : 'NIP. .................................................'}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

