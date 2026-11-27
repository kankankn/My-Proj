import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  X,
  Sun,
  Moon,
  ShieldCheck,
  ChevronRight,
  Table,
  ChevronLeft,
  UserCog,
  LogOut,
  UserCheck,
  History,
  DatabaseBackup,
} from 'lucide-react';
import { AsnStatus, AuthUser, Department } from '../../types/trip';

export type NavTab = 'dashboard' | 'matriks' | 'log' | 'pegawai' | 'bidang' | 'operator';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  employeeCount: number;
  departmentCount: number;
  departments: Department[];
  currentUser: AuthUser;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  asnCounts?: Record<AsnStatus, number>;
  logCount?: number;
  onOpenBackupRestore?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  employeeCount,
  departmentCount,
  departments,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
  asnCounts,
  logCount = 0,
  onOpenBackupRestore,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const userDept = currentUser.bidangId
    ? departments.find((d) => d.id === currentUser.bidangId)
    : undefined;
  const userDeptInisial = userDept?.inisial || currentUser.bidangInisial || 'BIDANG';
  const userDeptNama = userDept?.nama || currentUser.bidangNama || 'Unit Bidang';

  const allNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      subtitle: 'Halaman Utama & Kalender',
      icon: LayoutDashboard,
      badge: 'Kalender',
      adminOnly: false,
    },
    {
      id: 'matriks' as NavTab,
      label: 'Matriks SPPD',
      subtitle: 'Tampilan Baris & Kolom Pegawai',
      icon: Table,
      badge: 'Matriks',
      adminOnly: false,
    },
    {
      id: 'pegawai' as NavTab,
      label: 'Pegawai',
      subtitle: 'Kelola data pegawai',
      icon: Users,
      badge: `${employeeCount}`,
      adminOnly: true,
    },
    {
      id: 'bidang' as NavTab,
      label: 'Bidang',
      subtitle: 'Kelola unit kerja',
      icon: Building2,
      badge: `${departmentCount}`,
      adminOnly: true,
    },
    {
      id: 'operator' as NavTab,
      label: 'Operator',
      subtitle: 'Manajemen user untuk operator',
      icon: UserCog,
      badge: 'Akses',
      adminOnly: true,
    },
    {
      id: 'log' as NavTab,
      label: 'Log & Beban',
      subtitle: 'Riwayat & Beban Tugas',
      icon: History,
      badge: `${logCount}`,
      adminOnly: false,
    },
  ];

  const navItems = allNavItems.filter((item) => isAdmin || !item.adminOnly);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:static lg:z-30 shrink-0 ${
          isOpen
            ? 'w-64 translate-x-0 opacity-100 shadow-2xl lg:shadow-none'
            : '-translate-x-full w-0 opacity-0 pointer-events-none lg:w-0 lg:border-r-0'
        }`}
      >
        <div className="w-64 min-w-64 flex flex-col h-full overflow-hidden">
          {/* Brand / Logo Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                  SIM-SPPD
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                  Sistem Perjalanan Dinas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup / Geser menu samping"
              title="Sembunyikan menu samping (Perlebar Layar)"
            >
              <ChevronLeft className="w-5 h-5 hidden lg:block" />
              <X className="w-5 h-5 lg:hidden" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Menu Navigasi
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.label}
                      </div>
                      <div
                        className={`text-[10px] leading-tight truncate mt-0.5 ${
                          isActive
                            ? 'text-indigo-100'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 opacity-60 transition-transform ${
                        isActive ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              );
            })}

            {/* ASN Status Summary Card inside sidebar */}
            {asnCounts && (
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 px-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                  Jumlah Pegawai
                </div>
                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">PNS</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {asnCounts.PNS || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">PPPK</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {asnCounts.PPPK || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">PPPK PW</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {asnCounts['PPPK PW'] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Non ASN/Lainnya</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {asnCounts['Non ASN/Lainnya'] || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Anti-Bentrok Protection Info */}
            <div className="pt-3 px-3">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-[11px] leading-snug">
                  <span className="font-bold block">Proteksi Anti-Bentrok</span>
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                    Validasi otomatis jadwal harian
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Footer: Active User Session, Theme Toggle & Logout */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 space-y-2.5">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.displayName || currentUser.username}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isAdmin
                      ? `${currentUser.username} · Administrator`
                      : `${currentUser.username} · ${userDeptInisial}`}
                  </div>
                </div>
              </div>
              {!isAdmin && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/70 text-[10px] text-indigo-700 dark:text-indigo-300 font-medium truncate" title={userDeptNama}>
                  Akses: {userDeptNama}
                </div>
              )}
            </div>

            {isAdmin && onOpenBackupRestore && (
              <button
                type="button"
                onClick={onOpenBackupRestore}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs cursor-pointer"
                title="Backup & Restore seluruh data aplikasi dalam satu klik"
              >
                <DatabaseBackup className="w-3.5 h-3.5" />
                <span>Backup &amp; Restore Data</span>
              </button>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Gelap</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-2xs cursor-pointer"
                title="Keluar dari akun saat ini"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
