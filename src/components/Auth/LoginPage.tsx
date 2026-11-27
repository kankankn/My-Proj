import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Table,
  Building2,
  Sun,
  Moon,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { AuthUser } from '../../types/trip';

interface LoginPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  sessionNotice?: string | null;
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  theme,
  onToggleTheme,
  sessionNotice,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(sessionNotice || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Masukkan username dan password Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.token || !data.user) {
        setErrorMessage(data.error || 'Gagal masuk. Periksa kembali username dan password Anda.');
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch {
      setErrorMessage('Tidak dapat terhubung ke server autentikasi. Coba beberapa saat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 grid grid-cols-1 lg:grid-cols-12 transition-colors duration-200">
      {/* Left Institutional Showcase Panel */}
      <section className="lg:col-span-7 bg-slate-900 text-slate-100 relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-14 border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle architectural hairline grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"
        />

        {/* Mobile Theme Switcher */}
        <div className="relative z-10 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Gelap</span>
              </>
            )}
          </button>
        </div>
        <div className="hidden lg:block" />

        {/* Editorial Headline & Capability Summary */}
        <div className="relative z-10 my-10 lg:my-0 max-w-xl mx-auto w-full space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight text-center">
              KENDALI SPPD
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-center">
              Aplikasi Kendali Perjalanan Dinas
            </p>
          </div>

          {/* 3 Clean Capability Rows with Hairline Dividers */}
          <div className="border-t border-white/10 divide-y divide-white/10">
            <div className="py-4 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Proteksi Anti-Bentrok Harian</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Mencegah pegawai ditugaskan pada dua perjalanan dinas di tanggal yang sama secara otomatis saat penyusunan SPPD.
                </p>
              </div>
            </div>

            <div className="py-4 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Pengelolaan Penugasan Lintas Bidang</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Pencatatan perjalanan dinas terstruktur per bidang dengan akses data pegawai yang terpusat.
                </p>
              </div>
            </div>

            <div className="py-4 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/25 text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                <Table className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Kalender, Matriks SPPD &amp; Ekspor Laporan</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Pemantauan jadwal bulanan, sinkronisasi Excel, serta pencetakan dokumen SPPD berformat PDF.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Institutional Footer */}
        <div className="relative z-10 flex items-center justify-between gap-4 text-xs text-slate-400 border-t border-white/10 pt-5">
          <span>KENDALI SPPD · Proteksi Kesalahan Jadwal Harian</span>
          <span className="hidden sm:inline">Dashboard · Matriks · Laporan</span>
        </div>
      </section>

      {/* Right Login Workspace */}
      <section className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Desktop Theme Switcher */}
        <div className="hidden lg:flex justify-end">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mode Gelap</span>
              </>
            )}
          </button>
        </div>

        {/* Centered Single-Elevation Login Card */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-7 sm:p-8 space-y-6">
            <div className="space-y-1.5 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
                Login
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-center">
                Masukkan username dan password Anda.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer min-h-[42px]"
              >
                <span>{isSubmitting ? 'Memverifikasi Akun...' : 'Login'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        <div className="hidden lg:block" />
      </section>
    </div>
  );
};
