import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Camera, 
  CameraOff, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  Building2, 
  Check, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Info,
  Maximize2
} from 'lucide-react';
import { Employee, Department, ConflictRecord, BusinessTrip } from '../../types/trip';
import { 
  matchScannedNamesWithEmployees, 
  ScannedMatchItem,
  calculateEmployeeNameSimilarity 
} from '../../utils/nameSimilarity';
import { checkTripConflicts, formatIndonesianDate } from '../../utils/dateUtils';
import { getDeptBadgeStyle } from '../../utils/colorUtils';
import { getAsnBadgeClass } from '../../utils/asnUtils';

interface CameraNameScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  departments: Department[];
  allTrips: BusinessTrip[];
  tanggalMulai: string;
  tanggalSelesai: string;
  currentTripId?: string;
  authToken?: string;
  onApplyEmployees: (selectedIds: string[], extractedDetails?: {
    nomorSurat?: string | null;
    namaKegiatan?: string | null;
    tujuan?: string | null;
  }) => void;
}

type ScanMode = 'camera' | 'upload' | 'text';

export const CameraNameScannerModal: React.FC<CameraNameScannerModalProps> = ({
  isOpen,
  onClose,
  employees,
  departments,
  allTrips,
  tanggalMulai,
  tanggalSelesai,
  currentTripId,
  authToken,
  onApplyEmployees,
}) => {
  const [activeMode, setActiveMode] = useState<ScanMode>('camera');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [manualText, setManualText] = useState('');
  
  // Results
  const [matchResults, setMatchResults] = useState<ScannedMatchItem[]>([]);
  const [extractedDetails, setExtractedDetails] = useState<{
    nomorSurat?: string | null;
    namaKegiatan?: string | null;
    tujuan?: string | null;
  } | null>(null);
  const [applyDetailsToForm, setApplyDetailsToForm] = useState(true);

  // Department map for fast lookup
  const deptsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);

  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur kamera tidak didukung pada browser ini atau koneksi tidak aman (HTTPS diperlukan).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Gagal mengakses kamera perangkat.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Tidak ada perangkat kamera yang terdeteksi.';
        } else {
          msg = err.message;
        }
      }
      setCameraError(msg);
    }
  }, [facingMode, stopCamera]);

  // Manage camera lifecycle when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen && activeMode === 'camera' && !capturedImage && !isProcessing) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, capturedImage, isProcessing, startCamera, stopCamera]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setMatchResults([]);
      setExtractedDetails(null);
      setCameraError(null);
      setIsProcessing(false);
      setManualText('');
    }
  }, [isOpen, stopCamera]);

  // Conflicts mapping for matched employees
  const conflictsMap = useMemo(() => {
    const map = new Map<string, ConflictRecord[]>();
    if (!tanggalMulai || !tanggalSelesai) return map;

    const matchedEmpIds = matchResults
      .map(r => r.matchedEmployee?.id)
      .filter((id): id is string => Boolean(id));

    if (matchedEmpIds.length === 0) return map;

    for (const empId of matchedEmpIds) {
      const conflicts = checkTripConflicts(
        [empId],
        tanggalMulai,
        tanggalSelesai,
        allTrips,
        employees,
        departments,
        currentTripId
      );
      if (conflicts.length > 0) {
        map.set(empId, conflicts);
      }
    }

    return map;
  }, [matchResults, tanggalMulai, tanggalSelesai, allTrips, employees, departments, currentTripId]);

  // Capture photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedImage(dataUrl);
    stopCamera();
    analyzeDocumentImage(dataUrl);
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCapturedImage(base64);
      analyzeDocumentImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Core API call to server-side Gemini OCR & text analysis
  const analyzeDocumentImage = async (base64Image: string) => {
    setIsProcessing(true);
    setProcessStep('Membaca dan memindai teks pada dokumen dengan AI...');
    setCameraError(null);

    try {
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      const detectedMimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const response = await fetch('/api/scan-document', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: detectedMimeType,
        }),
      });

      setProcessStep('Mencocokkan nama terdeteksi dengan database pegawai SIM-SPPD...');
      const data = await response.json();

      let detectedList: string[] = [];
      if (data.success && Array.isArray(data.detectedNames) && data.detectedNames.length > 0) {
        detectedList = data.detectedNames;
      } else {
        // If Gemini did not detect names or API key not present, check if raw summary or message
        if (data.message && data.source === 'no_api_key') {
          setCameraError('AI Scanner siap. Anda juga dapat menggunakan mode Salin/Tempel Teks jika ingin memproses daftar nama langsung.');
        } else if (detectedList.length === 0) {
          setCameraError('Tidak ditemukan nama pegawai yang jelas pada foto. Pastikan dokumen tersorot terang dan tidak buram, atau gunakan foto yang lebih dekat.');
        }
      }

      if (data.extractedDetails) {
        setExtractedDetails(data.extractedDetails);
      }

      // Perform deep similarity matching
      setProcessStep('Menghitung indeks kemiripan dan deteksi nama terdekat...');
      const matches = matchScannedNamesWithEmployees(detectedList, employees);
      setMatchResults(matches);
    } catch (err) {
      console.error('Scan error:', err);
      setCameraError('Gagal memproses gambar dokumen. Periksa koneksi atau coba ambil foto kembali.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  // Manual text analyze
  const analyzeManualText = () => {
    if (!manualText.trim()) return;

    setIsProcessing(true);
    setProcessStep('Mengekstrak dan mencocokkan nama dengan database...');

    try {
      const lines = manualText
        .split(/\r?\n/)
        .map(l => l.replace(/^(\d+[\.\)]|[a-zA-Z][\.\)]|[-•*])\s*/, '').trim())
        .filter(l => l.length >= 2);

      const matches = matchScannedNamesWithEmployees(lines, employees);
      setMatchResults(matches);
      setExtractedDetails(null);
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  // Toggle selection for an individual match
  const toggleMatchSelection = (id: string) => {
    setMatchResults(prev =>
      prev.map(item => {
        if (item.id === id) {
          // If conflict exists and trying to select, warn user
          if (!item.selected && item.matchedEmployee && conflictsMap.has(item.matchedEmployee.id)) {
            // allow toggle but warning will be clearly visible
          }
          return { ...item, selected: !item.selected };
        }
        return item;
      })
    );
  };

  // Select all viable matches
  const selectAllViableMatches = () => {
    setMatchResults(prev =>
      prev.map(item => ({
        ...item,
        selected: Boolean(item.matchedEmployee),
      }))
    );
  };

  // Deselect all
  const deselectAllMatches = () => {
    setMatchResults(prev =>
      prev.map(item => ({
        ...item,
        selected: false,
      }))
    );
  };

  // Swap matched employee with an alternative suggestion or manual pick
  const changeMatchedEmployee = (matchId: string, newEmployeeId: string) => {
    const newEmp = employees.find(e => e.id === newEmployeeId) || null;
    setMatchResults(prev =>
      prev.map(item => {
        if (item.id === matchId) {
          if (!newEmp) {
            return {
              ...item,
              matchedEmployee: null,
              score: 0,
              matchLevel: 'low',
              reason: 'Pilihan dikosongkan',
              selected: false,
            };
          }
          const sim = calculateEmployeeNameSimilarity(item.rawScannedText, newEmp);
          return {
            ...item,
            matchedEmployee: newEmp,
            score: sim.score,
            matchLevel: sim.matchLevel,
            reason: `Dipilih manual: ${sim.reason}`,
            selected: true,
          };
        }
        return item;
      })
    );
  };

  // Apply chosen employees to the SPPD Form
  const handleApply = () => {
    const selectedIds = matchResults
      .filter(item => item.selected && item.matchedEmployee)
      .map(item => item.matchedEmployee!.id);

    const detailsToPass = applyDetailsToForm && extractedDetails ? extractedDetails : undefined;

    onApplyEmployees(selectedIds, detailsToPass);
    onClose();
  };

  // Retake photo / start over
  const handleRetake = () => {
    setCapturedImage(null);
    setMatchResults([]);
    setExtractedDetails(null);
    setCameraError(null);
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  // Summary counts
  const totalDetected = matchResults.length;
  const exactMatchesCount = matchResults.filter(r => r.score >= 88).length;
  const closeMatchesCount = matchResults.filter(r => r.score >= 60 && r.score < 88).length;
  const lowMatchesCount = matchResults.filter(r => r.score < 60).length;
  const selectedCount = matchResults.filter(r => r.selected && r.matchedEmployee).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs text-white flex items-center justify-center shadow-inner shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  Scanner Dokumen & Deteksi Nama Pegawai
                </h3>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/25 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  AI Vision
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Scan Surat Tugas / SPPD menggunakan kamera untuk mendeteksi pelaksana tugas & kalkulasi kemiripan nama
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            aria-label="Tutup Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Mode Selector Bar */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs shrink-0">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveMode('camera');
                if (!capturedImage) startCamera();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeMode === 'camera'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Perangkat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('upload');
                stopCamera();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeMode === 'upload'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Unggah Foto Dokumen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('text');
                stopCamera();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeMode === 'text'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Salin / Tempel Teks</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pengecekan bentrok tanggal aktif ({formatIndonesianDate(tanggalMulai)} s.d. {formatIndonesianDate(tanggalSelesai)})</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Active Error / Notice Banner */}
          {cameraError && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">{cameraError}</div>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* VIEW A: Camera & Capture View (When no results yet or retaking) */}
          {matchResults.length === 0 && !isProcessing && (
            <>
              {/* MODE 1: Camera Feed */}
              {activeMode === 'camera' && (
                <div className="space-y-4">
                  <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-4/3 sm:aspect-16/10 flex items-center justify-center border-2 border-slate-800 shadow-inner group">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* Scanning Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      {/* Document frame border with corner marks */}
                      <div className="relative w-full max-w-lg h-4/5 border-2 border-indigo-400/70 rounded-xl flex flex-col justify-between p-3 bg-indigo-500/5 shadow-2xl">
                        {/* Corner markers */}
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-white rounded-tl-sm" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-white rounded-tr-sm" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-white rounded-bl-sm" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-white rounded-br-sm" />

                        {/* Animated laser line */}
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />

                        <div className="text-center bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium py-1.5 px-3 rounded-lg mx-auto border border-white/20">
                          Arahkan kamera ke bagian daftar nama / surat perintah tugas
                        </div>
                      </div>
                    </div>

                    {/* Camera Control Overlay Buttons */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                      {/* Switch camera button */}
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition-all shadow-md cursor-pointer"
                        title="Balik Kamera (Depan / Belakang)"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>

                      {/* Main Capture Shutter Button */}
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-sm shadow-xl flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-indigo-400/40"
                      >
                        <Camera className="w-5 h-5" />
                        <span>Ambil Foto & Scan Nama</span>
                      </button>
                    </div>

                    {!cameraStream && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white space-y-2 p-4 text-center">
                        <CameraOff className="w-10 h-10 text-slate-500 animate-pulse" />
                        <p className="text-xs text-slate-300">Menghubungkan ke kamera...</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-indigo-600 text-xs font-semibold rounded-lg text-white"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden canvas for drawing frame snapshot */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {/* MODE 2: File Upload */}
              {activeMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/30 rounded-2xl p-10 text-center transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs transition-colors">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Pilih File Foto Dokumen atau Seret ke Sini
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3">
                    Format gambar JPG, PNG, WEBP dari hasil foto kamera atau scan dokumen Surat Tugas / SPPD.
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pilih Berkas Gambar
                  </span>
                </div>
              )}

              {/* MODE 3: Manual Text Paste */}
              {activeMode === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Salin / Tempel Daftar Nama dari Surat Tugas / WhatsApp:
                    </label>
                    <textarea
                      rows={6}
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Contoh:&#10;1. Dr. H. Ahmad Fauzi, S.T., M.Si.&#10;2. Budi Santoso&#10;3. Rina Marlina, S.Kom."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!manualText.trim()}
                      onClick={analyzeManualText}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Cocokkan Kemiripan Nama</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW B: Loading & AI Processing State */}
          {isProcessing && (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                  <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sedang Menganalisis Dokumen...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {processStep || 'Memproses gambar dan mencocokkan kemiripan nama pegawai terdaftar...'}
                </p>
              </div>
            </div>
          )}

          {/* VIEW C: Matched Results & Similarity Review */}
          {matchResults.length > 0 && !isProcessing && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Summary Metrics Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Hasil Deteksi Nama ({totalDetected} Terdeteksi)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Centang pegawai yang ingin dimasukkan ke dalam daftar pelaksana tugas SPPD
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    ✓ {exactMatchesCount} Cocok Tepat (≥88%)
                  </span>

                  {closeMatchesCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                      ⚡ {closeMatchesCount} Nama Berbeda Sedikit (60-87%)
                    </span>
                  )}

                  {lowMatchesCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                      ? {lowMatchesCount} Belum Terdaftar (&lt;60%)
                    </span>
                  )}
                </div>
              </div>

              {/* Extracted Trip Details Card (Optional Autofill) */}
              {extractedDetails && (extractedDetails.nomorSurat || extractedDetails.namaKegiatan || extractedDetails.tujuan) && (
                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Rincian Surat Tugas Terbaca dari Dokumen:</span>
                    </div>
                    <label className="flex items-center gap-1.5 font-semibold text-indigo-800 dark:text-indigo-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyDetailsToForm}
                        onChange={(e) => setApplyDetailsToForm(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Isi otomatis ke formulir</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    {extractedDetails.nomorSurat && (
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 block text-[10px]">Nomor Surat Tugas:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{extractedDetails.nomorSurat}</span>
                      </div>
                    )}
                    {extractedDetails.namaKegiatan && (
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 block text-[10px]">Nama Kegiatan:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{extractedDetails.namaKegiatan}</span>
                      </div>
                    )}
                    {extractedDetails.tujuan && (
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-slate-400 block text-[10px]">Tujuan:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{extractedDetails.tujuan}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Selection Actions */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-900 dark:text-white">{selectedCount}</strong> dari {totalDetected} pegawai siap dimasukkan
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllViableMatches}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih Semua yang Cocok
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={deselectAllMatches}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Batal Pilih Semua
                  </button>
                </div>
              </div>

              {/* Matched Employees List */}
              <div className="space-y-3">
                {matchResults.map((item, idx) => {
                  const emp = item.matchedEmployee;
                  const dept = emp ? deptsMap.get(emp.bidangId) : undefined;
                  const conflicts = emp ? conflictsMap.get(emp.id) : undefined;
                  const hasConflict = Boolean(conflicts && conflicts.length > 0);

                  // Similarity badge color & text
                  let similarityBadgeColor = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
                  let similarityLabel = `${item.score}% Kemiripan Rendah`;

                  if (item.score >= 88) {
                    similarityBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
                    similarityLabel = `${item.score}% Cocok Tepat`;
                  } else if (item.score >= 60) {
                    similarityBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
                    similarityLabel = `${item.score}% Nama Berbeda Sedikit (Kemungkinan Terdekat)`;
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.selected
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Checkbox and Scanned Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={!item.matchedEmployee}
                            onChange={() => toggleMatchSelection(item.id)}
                            className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                          />

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Raw Scanned text vs Matched Name */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Teks Dokumen:
                              </span>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                "{item.rawScannedText}"
                              </span>

                              {/* Similarity Badge */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${similarityBadgeColor}`}>
                                {item.score >= 88 ? (
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                )}
                                <span>{similarityLabel}</span>
                              </span>
                            </div>

                            {/* Registered Employee Card */}
                            {emp ? (
                              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {emp.nama}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  NIP. {emp.nip}
                                </span>

                                {dept && (
                                  <span
                                    style={getDeptBadgeStyle(dept)}
                                    className="px-2 py-0.5 text-[10px] font-bold rounded-md border shadow-2xs"
                                  >
                                    [{dept.inisial}] {dept.nama}
                                  </span>
                                )}

                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getAsnBadgeClass(emp.statusAsn)}`}>
                                  {emp.statusAsn || 'PNS'}
                                </span>

                                {emp.pangkatGol && (
                                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                    {emp.pangkatGol}
                                  </span>
                                )}

                                <span className="text-slate-500 text-[11px]">
                                  • {emp.jabatan}
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                Nama ini tidak cocok dengan data pegawai terdaftar. Anda dapat memilih pegawai secara manual di bawah.
                              </div>
                            )}

                            {/* Reason / Similarity Details */}
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              Indikasi: {item.reason}
                            </p>

                            {/* Conflict Alert if applicable */}
                            {hasConflict && (
                              <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-800 dark:text-rose-200 text-[11px] flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  <strong>Perhatian:</strong> Pegawai ini memiliki jadwal dinas lain pada {formatIndonesianDate(conflicts?.[0]?.conflictingDate || '')} ("{conflicts?.[0]?.conflictingTripName}").
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dropdown for Changing / Overriding the matched employee */}
                        <div className="sm:w-56 shrink-0 self-end sm:self-center">
                          <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Pilih / Ganti Pegawai Terdaftar:
                          </label>
                          <select
                            value={emp?.id || ''}
                            onChange={(e) => changeMatchedEmployee(item.id, e.target.value)}
                            className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- Tidak Dipilih --</option>
                            {/* Closest suggestions first */}
                            {item.alternatives.map(alt => (
                              <option key={alt.employee.id} value={alt.employee.id}>
                                ⭐ {alt.employee.nama} ({alt.score}%)
                              </option>
                            ))}
                            <option disabled>──────────</option>
                            {/* All registered employees */}
                            {[...employees]
                              .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
                              .map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.nama} [{deptsMap.get(e.bidangId)?.inisial || 'DINAS'}]
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div>
            {matchResults.length > 0 && (
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Ulang / Foto Lain</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            {matchResults.length > 0 && (
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Terapkan {selectedCount} Pegawai ke SPPD</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
