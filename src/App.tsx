/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ActivityLogAction,
  ActivityLogCategory,
  ActivityLogEntry,
  AuthUser,
  BusinessTrip,
  Department,
  Employee,
  HolidayEntry,
} from './types/trip';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_EMPLOYEES, 
  INITIAL_TRIPS 
} from './data/initialData';
import { CalendarHeader } from './components/Calendar/CalendarHeader';
import { CalendarView } from './components/Calendar/CalendarView';
import { StatsSummary } from './components/Stats/StatsSummary';
import { TripFormModal } from './components/Modals/TripFormModal';
import { DayDetailsModal } from './components/Modals/DayDetailsModal';
import { TripDetailModal } from './components/Modals/TripDetailModal';
import { QuickAvailabilityCheckerModal } from './components/Modals/QuickAvailabilityCheckerModal';
import { EmployeeManagementModal } from './components/Modals/EmployeeManagementModal';
import { DepartmentManagementModal } from './components/Modals/DepartmentManagementModal';
import { PrintReportModal } from './components/Modals/PrintReportModal';
import { EmployeeTripMatrixModal } from './components/Modals/EmployeeTripMatrixModal';
import { HolidayManagementModal } from './components/Modals/HolidayManagementModal';
import { BackupRestoreModal, AppBackupPayload } from './components/Modals/BackupRestoreModal';
import { Sidebar, NavTab } from './components/Sidebar/Sidebar';
import { EmployeeView } from './components/Views/EmployeeView';
import { DepartmentView } from './components/Views/DepartmentView';
import { MatrixView } from './components/Views/MatrixView';
import { OperatorView } from './components/Views/OperatorView';
import { LogView } from './components/Views/LogView';
import { LoginPage } from './components/Auth/LoginPage';
import { formatDateKey } from './utils/dateUtils';
import { getDeptBadgeStyle } from './utils/colorUtils';

const STORAGE_KEYS = {
  DEPARTMENTS: 'sim_sppd_departments_v1',
  EMPLOYEES: 'sim_sppd_employees_v1',
  TRIPS: 'sim_sppd_trips_v1',
  HOLIDAYS: 'sim_sppd_holidays_v1',
  ACTIVITY_LOGS: 'sim_sppd_activity_logs_v1',
  THEME: 'sim_sppd_theme',
};

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 jam tanpa aktivitas

export default function App() {
  // Authentication State (held in memory only)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Navigation State (Dashboard, Matriks, Pegawai, Bidang, Operator)
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Theme State (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // 1. Persistent State
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_DEPARTMENTS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_EMPLOYEES;
  });

  const [trips, setTrips] = useState<BusinessTrip[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_TRIPS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [holidays, setHolidays] = useState<HolidayEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
  }, [holidays]);

  // 2. Calendar View & Date State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');

  // Filters & Search
  const [selectedBidangId, setSelectedBidangId] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [selectedAsnStatus, setSelectedAsnStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Modal States
  const [isTripFormOpen, setIsTripFormOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<BusinessTrip | null>(null);
  const [initialDateForTrip, setInitialDateForTrip] = useState<string>(formatDateKey(new Date()));

  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
  const [selectedDayDateKey, setSelectedDayDateKey] = useState<string | null>(null);

  const [isTripDetailOpen, setIsTripDetailOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<BusinessTrip | null>(null);

  const [isCheckerOpen, setIsCheckerOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);

  // Month / Week Navigation
  const handlePrevMonth = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const employeesMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const departmentsMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);
  const holidaysMap = useMemo(() => new Map(holidays.map(h => [h.tanggal, h])), [holidays]);

  // Filtered trips (O(1) employee & department lookup via Map)
  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips.filter(trip => {
      if (selectedBidangId !== 'ALL' && trip.bidangId !== selectedBidangId) {
        return false;
      }
      if (selectedEmployeeId !== 'ALL' && !trip.karyawanIds.includes(selectedEmployeeId)) {
        return false;
      }
      if (selectedAsnStatus !== 'ALL') {
        const hasMatchingAsn = trip.karyawanIds.some(id => {
          const emp = employeesMap.get(id);
          return (emp?.statusAsn || 'PNS') === selectedAsnStatus;
        });
        if (!hasMatchingAsn) return false;
      }
      if (q) {
        const dept = departmentsMap.get(trip.bidangId);
        const matchTitle = trip.namaKegiatan.toLowerCase().includes(q);
        const matchTujuan = trip.tujuan.toLowerCase().includes(q);
        const matchSurat = trip.nomorSurat.toLowerCase().includes(q);
        const matchDeptInisial = dept ? dept.inisial.toLowerCase().includes(q) : false;
        const matchEmpName = trip.karyawanIds.some(id => {
          const emp = employeesMap.get(id);
          return emp ? emp.nama.toLowerCase().includes(q) : false;
        });

        if (!matchTitle && !matchTujuan && !matchSurat && !matchDeptInisial && !matchEmpName) {
          return false;
        }
      }
      return true;
    });
  }, [trips, selectedBidangId, selectedEmployeeId, selectedAsnStatus, searchQuery, departmentsMap, employeesMap]);

  const isAdmin = currentUser?.role === 'admin';
  const operatorBidangId = currentUser?.role === 'operator' ? currentUser.bidangId : undefined;
  const effectiveTab: NavTab =
    !isAdmin && (activeTab === 'pegawai' || activeTab === 'bidang' || activeTab === 'operator')
      ? 'dashboard'
      : activeTab;

  const appendActivityLog = (
    payload: {
      category: ActivityLogCategory;
      action: ActivityLogAction;
      title: string;
      details?: string;
      bidangId?: string;
      bidangInisial?: string;
      bidangNama?: string;
    },
    actorOverride?: AuthUser
  ) => {
    const actor = actorOverride || currentUser;
    if (!actor) return;

    const dept = payload.bidangId
      ? departments.find((d) => d.id === payload.bidangId)
      : actor.bidangId
      ? departments.find((d) => d.id === actor.bidangId)
      : undefined;

    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actorUsername: actor.username,
      actorDisplayName: actor.displayName || actor.username,
      actorRole: actor.role,
      bidangId: payload.bidangId ?? dept?.id ?? actor.bidangId,
      bidangInisial: payload.bidangInisial ?? dept?.inisial ?? actor.bidangInisial,
      bidangNama: payload.bidangNama ?? dept?.nama ?? actor.bidangNama,
      category: payload.category,
      action: payload.action,
      title: payload.title,
      details: payload.details,
    };

    setActivityLogs((prev) => [entry, ...prev].slice(0, 500));
  };

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    lastActivityRef.current = Date.now();
    setAuthToken(token);
    setCurrentUser(user);
    setSessionNotice(null);
    setActiveTab('dashboard');
    appendActivityLog(
      {
        category: 'auth',
        action: 'Login',
        title: `Login berhasil (${user.username})`,
        details: user.role === 'admin' ? 'Masuk sebagai Administrator' : `Masuk sebagai Operator ${user.bidangInisial || ''}`,
      },
      user
    );
  };

  const handleLogout = (notice?: string, customTitle?: string) => {
    if (currentUser) {
      appendActivityLog({
        category: 'auth',
        action: 'Logout',
        title: customTitle || `Logout akun (${currentUser.username})`,
      });
    }
    setAuthToken(null);
    setCurrentUser(null);
    setSessionNotice(notice || null);
    setActiveTab('dashboard');
    setIsTripFormOpen(false);
    setIsDayDetailsOpen(false);
    setIsTripDetailOpen(false);
    setIsCheckerOpen(false);
    setIsEmployeesOpen(false);
    setIsDepartmentsOpen(false);
    setIsPrintReportOpen(false);
    setIsMatrixModalOpen(false);
    setIsHolidayModalOpen(false);
    setIsBackupRestoreOpen(false);
  };

  const handleLogoutRef = useRef(handleLogout);
  handleLogoutRef.current = handleLogout;

  // Auto-logout if no user activity for 1 hour
  useEffect(() => {
    if (!currentUser || !authToken) return;

    lastActivityRef.current = Date.now();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        handleLogoutRef.current(
          'Sesi berakhir otomatis karena tidak ada aktivitas selama 1 jam. Silakan login kembali.',
          `Auto-logout karena tidak aktif 1 jam (${currentUser.username})`
        );
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkIdle();
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'pointerdown',
    ];

    for (const evt of activityEvents) {
      window.addEventListener(evt, markActive, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(checkIdle, 15000);

    return () => {
      for (const evt of activityEvents) {
        window.removeEventListener(evt, markActive);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [currentUser, authToken]);

  // Trip Actions (Enforces Operator Bidang ownership)
  const handleSaveTrip = (tripData: Omit<BusinessTrip, 'id' | 'createdAt'>, existingId?: string) => {
    const enforcedBidangId = operatorBidangId || tripData.bidangId;
    const dept = departments.find((d) => d.id === enforcedBidangId);

    if (existingId) {
      setTrips(prev => prev.map(t => {
        if (t.id !== existingId) return t;
        if (operatorBidangId && t.bidangId !== operatorBidangId) return t;
        return {
          ...t,
          ...tripData,
          bidangId: enforcedBidangId,
        };
      }));
      appendActivityLog({
        category: 'sppd',
        action: 'Ubah',
        title: `Mengubah SPPD "${tripData.namaKegiatan}"`,
        details: `No. ${tripData.nomorSurat || '-'} · Tujuan: ${tripData.tujuan} (${tripData.tanggalMulai} s.d. ${tripData.tanggalSelesai}) · ${tripData.karyawanIds.length} pegawai`,
        bidangId: enforcedBidangId,
        bidangInisial: dept?.inisial,
        bidangNama: dept?.nama,
      });
    } else {
      const newTrip: BusinessTrip = {
        ...tripData,
        bidangId: enforcedBidangId,
        id: `trip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
      };
      setTrips(prev => [...prev, newTrip]);
      appendActivityLog({
        category: 'sppd',
        action: 'Tambah',
        title: `Menambahkan SPPD "${tripData.namaKegiatan}"`,
        details: `No. ${tripData.nomorSurat || '-'} · Tujuan: ${tripData.tujuan} (${tripData.tanggalMulai} s.d. ${tripData.tanggalSelesai}) · ${tripData.karyawanIds.length} pegawai`,
        bidangId: enforcedBidangId,
        bidangInisial: dept?.inisial,
        bidangNama: dept?.nama,
      });
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (targetTrip && (!operatorBidangId || targetTrip.bidangId === operatorBidangId)) {
      const dept = departments.find((d) => d.id === targetTrip.bidangId);
      appendActivityLog({
        category: 'sppd',
        action: 'Hapus',
        title: `Menghapus SPPD "${targetTrip.namaKegiatan}"`,
        details: `No. ${targetTrip.nomorSurat || '-'} · ${targetTrip.tanggalMulai} s.d. ${targetTrip.tanggalSelesai}`,
        bidangId: targetTrip.bidangId,
        bidangInisial: dept?.inisial,
        bidangNama: dept?.nama,
      });
    }
    setTrips(prev => prev.filter(t => {
      if (t.id !== tripId) return true;
      if (operatorBidangId && t.bidangId !== operatorBidangId) return true;
      return false;
    }));
  };

  // Employee Master Handlers (Admin Only)
  const handleAddEmployee = (empData: Omit<Employee, 'id'>) => {
    if (!isAdmin) return;
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
    };
    setEmployees(prev => [...prev, newEmp]);
    appendActivityLog({
      category: 'pegawai',
      action: 'Tambah',
      title: `Menambahkan pegawai "${newEmp.nama}"`,
      details: `NIP. ${newEmp.nip} · ${newEmp.statusAsn || 'PNS'} · ${newEmp.jabatan}`,
      bidangId: newEmp.bidangId,
    });
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    if (!isAdmin) return;
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    appendActivityLog({
      category: 'pegawai',
      action: 'Ubah',
      title: `Memperbarui data pegawai "${updatedEmp.nama}"`,
      details: `NIP. ${updatedEmp.nip} · ${updatedEmp.statusAsn || 'PNS'}`,
      bidangId: updatedEmp.bidangId,
    });
  };

  const handleDeleteEmployee = (empId: string) => {
    if (!isAdmin) return;
    const target = employees.find((e) => e.id === empId);
    setEmployees(prev => prev.filter(e => e.id !== empId));
    if (target) {
      appendActivityLog({
        category: 'pegawai',
        action: 'Hapus',
        title: `Menghapus pegawai "${target.nama}"`,
        details: `NIP. ${target.nip}`,
        bidangId: target.bidangId,
      });
    }
  };

  const handleBulkImportEmployees = (importedEmployees: Employee[]) => {
    if (!isAdmin) return;
    setEmployees(importedEmployees);
    appendActivityLog({
      category: 'pegawai',
      action: 'Impor',
      title: 'Impor data pegawai dari Excel',
      details: `Total data pegawai setelah impor: ${importedEmployees.length} orang`,
    });
  };

  const handleBulkImportTrips = (importedTrips: BusinessTrip[]) => {
    if (!isAdmin) return;
    setTrips(importedTrips);
    appendActivityLog({
      category: 'sppd',
      action: 'Impor',
      title: 'Impor data SPPD dari Excel',
      details: `Total jadwal SPPD setelah impor: ${importedTrips.length} perjalanan`,
    });
  };

  // Department Master Handlers (Admin Only)
  const handleAddDepartment = (deptData: Omit<Department, 'id'>) => {
    if (!isAdmin) return;
    const newDept: Department = {
      ...deptData,
      id: `dept-${Date.now()}`,
    };
    setDepartments(prev => [...prev, newDept]);
    appendActivityLog({
      category: 'bidang',
      action: 'Tambah',
      title: `Menambahkan bidang "${newDept.nama}"`,
      details: `Inisial: ${newDept.inisial}`,
      bidangId: newDept.id,
      bidangInisial: newDept.inisial,
      bidangNama: newDept.nama,
    });
  };

  const handleUpdateDepartment = (updatedDept: Department) => {
    if (!isAdmin) return;
    setDepartments(prev => prev.map(d => d.id === updatedDept.id ? updatedDept : d));
    appendActivityLog({
      category: 'bidang',
      action: 'Ubah',
      title: `Memperbarui bidang "${updatedDept.nama}"`,
      details: `Inisial: ${updatedDept.inisial}`,
      bidangId: updatedDept.id,
      bidangInisial: updatedDept.inisial,
      bidangNama: updatedDept.nama,
    });
  };

  const handleDeleteDepartment = (deptId: string) => {
    if (!isAdmin) return;
    const target = departments.find((d) => d.id === deptId);
    setDepartments(prev => prev.filter(d => d.id !== deptId));
    if (target) {
      appendActivityLog({
        category: 'bidang',
        action: 'Hapus',
        title: `Menghapus bidang "${target.nama}"`,
        details: `Inisial: ${target.inisial}`,
      });
    }
  };

  // Holiday Management Handlers (Admin Only)
  const handleSaveHoliday = (entry: Omit<HolidayEntry, 'id'>) => {
    if (!isAdmin) return;
    const existing = holidays.find((h) => h.tanggal === entry.tanggal);
    if (existing) {
      setHolidays((prev) =>
        prev.map((h) => (h.tanggal === entry.tanggal ? { ...h, ...entry } : h))
      );
      appendActivityLog({
        category: 'libur',
        action: 'Ubah',
        title: `Memperbarui penanda ${entry.jenis} (${entry.tanggal})`,
        details: entry.keterangan,
      });
    } else {
      const newHoliday: HolidayEntry = {
        ...entry,
        id: `hol-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      setHolidays((prev) => [...prev, newHoliday]);
      appendActivityLog({
        category: 'libur',
        action: 'Tambah',
        title: `Menandai ${entry.jenis} (${entry.tanggal})`,
        details: entry.keterangan,
      });
    }
  };

  const handleDeleteHoliday = (id: string) => {
    if (!isAdmin) return;
    const target = holidays.find((h) => h.id === id);
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    if (target) {
      appendActivityLog({
        category: 'libur',
        action: 'Hapus',
        title: `Menghapus penanda ${target.jenis} (${target.tanggal})`,
        details: target.keterangan,
      });
    }
  };

  // Backup & Restore Handlers (Admin Only)
  const handleRecordBackup = (fileName: string) => {
    if (!isAdmin) return;
    appendActivityLog({
      category: 'sistem',
      action: 'Backup',
      title: `Mengunduh backup data (${fileName})`,
      details: `${departments.length} Bidang · ${employees.length} Pegawai · ${trips.length} SPPD · ${holidays.length} Tgl Merah`,
    });
  };

  const handleRestoreBackup = (data: AppBackupPayload['data'], fileName: string) => {
    if (!isAdmin) return;
    setDepartments(data.departments);
    setEmployees(data.employees);
    setTrips(data.trips);
    setHolidays(data.holidays || []);

    const restoredLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];
    const actor = currentUser;
    if (actor) {
      const restoreLog: ActivityLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date().toISOString(),
        actorUsername: actor.username,
        actorDisplayName: actor.displayName || actor.username,
        actorRole: actor.role,
        category: 'sistem',
        action: 'Restore',
        title: `Memulihkan data dari backup (${fileName})`,
        details: `${data.departments.length} Bidang · ${data.employees.length} Pegawai · ${data.trips.length} SPPD · ${data.holidays.length} Tgl Merah`,
      };
      setActivityLogs([restoreLog, ...restoredLogs].slice(0, 500));
    } else {
      setActivityLogs(restoredLogs.slice(0, 500));
    }
  };

  // Interactive Calendar Cell Click Handlers
  const handleSelectDate = (dateKey: string) => {
    setSelectedDayDateKey(dateKey);
    setIsDayDetailsOpen(true);
  };

  const handleAddTripToDate = (dateKey: string) => {
    setInitialDateForTrip(dateKey);
    setTripToEdit(null);
    setIsTripFormOpen(true);
  };

  const handleSelectTrip = (trip: BusinessTrip) => {
    setSelectedTrip(trip);
    setIsTripDetailOpen(true);
  };

  const handleEditTrip = (trip: BusinessTrip) => {
    if (operatorBidangId && trip.bidangId !== operatorBidangId) return;
    setTripToEdit(trip);
    setIsTripFormOpen(true);
  };

  const handleQuickAssignFromChecker = (employeeId: string, date: string) => {
    setInitialDateForTrip(date);
    setTripToEdit(null);
    setIsTripFormOpen(true);
  };

  const asnCounts = useMemo(() => {
    let PNS = 0;
    let PPPK = 0;
    let PPPK_PW = 0;
    let NON_ASN = 0;
    for (const e of employees) {
      const s = e.statusAsn || 'PNS';
      if (s === 'PNS') PNS++;
      else if (s === 'PPPK') PPPK++;
      else if (s === 'PPPK PW') PPPK_PW++;
      else if (s === 'Non ASN/Lainnya') NON_ASN++;
    }
    return {
      PNS,
      PPPK,
      'PPPK PW': PPPK_PW,
      'Non ASN/Lainnya': NON_ASN,
    } as Record<'PNS' | 'PPPK' | 'PPPK PW' | 'Non ASN/Lainnya', number>;
  }, [employees]);

  if (!currentUser || !authToken) {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={handleToggleTheme}
        sessionNotice={sessionNotice}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        activeTab={effectiveTab}
        onSelectTab={(tab) => {
          if (!isAdmin && (tab === 'pegawai' || tab === 'bidang' || tab === 'operator')) {
            return;
          }
          setActiveTab(tab);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        employeeCount={employees.length}
        departmentCount={departments.length}
        departments={departments}
        currentUser={currentUser}
        onLogout={() => handleLogout()}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        asnCounts={asnCounts}
        logCount={
          isAdmin
            ? activityLogs.length
            : activityLogs.filter((l) => l.actorUsername === currentUser.username).length
        }
        onOpenBackupRestore={isAdmin ? () => setIsBackupRestoreOpen(true) : undefined}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* View 1: DASHBOARD (Halaman Utama) */}
        {effectiveTab === 'dashboard' && (
          <>
            <CalendarHeader
              currentDate={currentDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedBidangId={selectedBidangId}
              onSelectBidangId={setSelectedBidangId}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployeeId={setSelectedEmployeeId}
              selectedAsnStatus={selectedAsnStatus}
              onSelectAsnStatus={setSelectedAsnStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              departments={departments}
              employees={employees}
              onOpenNewTripModal={() => {
                setTripToEdit(null);
                setInitialDateForTrip(formatDateKey(new Date()));
                setIsTripFormOpen(true);
              }}
              onOpenCheckerModal={() => setIsCheckerOpen(true)}
              onOpenMatrixModal={() => setActiveTab('matriks')}
              onPrintReport={() => setIsPrintReportOpen(true)}
              onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
              isAdmin={isAdmin}
              holidayCount={holidays.length}
              onOpenHolidayModal={() => setIsHolidayModalOpen(true)}
            />

            <main className="flex-1 max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
              {/* Statistics & Anti-Bentrok Health Bar */}
              <StatsSummary
                currentDate={currentDate}
                trips={trips}
                departments={departments}
                employees={employees}
              />

              {/* Legend / Info Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 mb-3 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 flex-wrap text-xs transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Inisial Bidang Pemberi Perintah:</span>
                  {departments.map(dept => (
                    <span
                      key={dept.id}
                      title={dept.nama}
                      style={getDeptBadgeStyle(dept)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs cursor-help ${dept.color.badgeBg}`}
                    >
                      {dept.inisial}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                    <span>Hari Ini</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Libur / Tanggal Merah</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>Cuti Bersama</span>
                  </span>
                </div>
              </div>

              {/* Calendar Core Display */}
              <CalendarView
                currentDate={currentDate}
                trips={filteredTrips}
                departments={departments}
                employees={employees}
                holidays={holidays}
                viewMode={viewMode}
                onSelectDate={handleSelectDate}
                onSelectTrip={handleSelectTrip}
                onAddTripToDate={handleAddTripToDate}
                onChangeDate={setCurrentDate}
              />
            </main>
          </>
        )}

        {/* View 2: MATRIKS SPPD */}
        {effectiveTab === 'matriks' && (
          <MatrixView
            trips={trips}
            departments={departments}
            employees={employees}
            holidays={holidays}
            initialDate={currentDate}
            onSelectTrip={handleSelectTrip}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            onBulkImportTrips={isAdmin ? handleBulkImportTrips : undefined}
            lockedBidangId={operatorBidangId}
          />
        )}

        {/* View 3: LOG AKTIVITAS & BEBAN TUGAS */}
        {effectiveTab === 'log' && (
          <LogView
            logs={activityLogs}
            trips={trips}
            employees={employees}
            departments={departments}
            isAdmin={isAdmin}
            currentUsername={currentUser.username}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            onClearLogs={() => setActivityLogs([])}
          />
        )}

        {/* View 4: PEGAWAI (Admin Only) */}
        {isAdmin && effectiveTab === 'pegawai' && (
          <EmployeeView
            employees={employees}
            departments={departments}
            allTrips={trips}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onBulkImportEmployees={handleBulkImportEmployees}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          />
        )}

        {/* View 5: BIDANG (Admin Only) */}
        {isAdmin && effectiveTab === 'bidang' && (
          <DepartmentView
            departments={departments}
            allTrips={trips}
            employees={employees}
            onAddDepartment={handleAddDepartment}
            onUpdateDepartment={handleUpdateDepartment}
            onDeleteDepartment={handleDeleteDepartment}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          />
        )}

        {/* View 6: OPERATOR (Admin Only) */}
        {isAdmin && effectiveTab === 'operator' && (
          <OperatorView
            authToken={authToken}
            currentUsername={currentUser.username}
            departments={departments}
            onUnauthorized={() =>
              handleLogout('Sesi Administrator berakhir. Silakan login kembali.')
            }
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            onLogActivity={(payload) => appendActivityLog(payload)}
          />
        )}

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 mt-auto transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <p>
              Sistem Pengecekan & Kalender Perjalanan Dinas (SIM-SPPD) • Proteksi Kesalahan Jadwal Harian
            </p>
          </div>
        </footer>
      </div>

      {/* MODALS */}
      {/* 1. Trip Form Modal (Create / Edit with strict anti-bentrok & bidang lock validation) */}
      <TripFormModal
        isOpen={isTripFormOpen}
        onClose={() => setIsTripFormOpen(false)}
        onSave={handleSaveTrip}
        initialDate={initialDateForTrip}
        tripToEdit={tripToEdit}
        departments={departments}
        employees={employees}
        allTrips={trips}
        holidays={holidays}
        lockedBidangId={operatorBidangId}
        authToken={authToken}
      />

      {/* 2. Day Details Modal (View day events & availability matrix) */}
      <DayDetailsModal
        isOpen={isDayDetailsOpen}
        onClose={() => setIsDayDetailsOpen(false)}
        dateKey={selectedDayDateKey}
        trips={trips}
        departments={departments}
        employees={employees}
        holiday={selectedDayDateKey ? holidaysMap.get(selectedDayDateKey) : undefined}
        isAdmin={isAdmin}
        onSaveHoliday={handleSaveHoliday}
        onDeleteHoliday={handleDeleteHoliday}
        onSelectTrip={handleSelectTrip}
        onAddTripToDate={handleAddTripToDate}
      />

      {/* 3. Trip Detail Modal (Full SPPD view, print, edit, delete) */}
      <TripDetailModal
        isOpen={isTripDetailOpen}
        onClose={() => setIsTripDetailOpen(false)}
        trip={selectedTrip}
        departments={departments}
        employees={employees}
        onEdit={handleEditTrip}
        onDelete={handleDeleteTrip}
        canModify={isAdmin || !selectedTrip || selectedTrip.bidangId === operatorBidangId}
      />

      {/* 4. Quick Availability & Conflict Checker Tool */}
      <QuickAvailabilityCheckerModal
        isOpen={isCheckerOpen}
        onClose={() => setIsCheckerOpen(false)}
        trips={trips}
        departments={departments}
        employees={employees}
        onQuickAssign={handleQuickAssignFromChecker}
        onSelectTrip={handleSelectTrip}
      />

      {/* 5. Master Data Pegawai Management (Admin Only) */}
      {isAdmin && (
        <EmployeeManagementModal
          isOpen={isEmployeesOpen}
          onClose={() => setIsEmployeesOpen(false)}
          employees={employees}
          departments={departments}
          allTrips={trips}
          onAddEmployee={handleAddEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onBulkImportEmployees={handleBulkImportEmployees}
        />
      )}

      {/* 6. Master Data Bidang / Inisial Management (Admin Only) */}
      {isAdmin && (
        <DepartmentManagementModal
          isOpen={isDepartmentsOpen}
          onClose={() => setIsDepartmentsOpen(false)}
          departments={departments}
          allTrips={trips}
          onAddDepartment={handleAddDepartment}
          onUpdateDepartment={handleUpdateDepartment}
          onDeleteDepartment={handleDeleteDepartment}
        />
      )}

      {/* 7. Printable Monthly Recap Modal */}
      <PrintReportModal
        isOpen={isPrintReportOpen}
        onClose={() => setIsPrintReportOpen(false)}
        currentDate={currentDate}
        trips={trips}
        departments={departments}
        employees={employees}
      />

      {/* 8. Excel Employee Duty Matrix Modal */}
      <EmployeeTripMatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        trips={trips}
        departments={departments}
        employees={employees}
        initialDate={currentDate}
        onSelectTrip={handleSelectTrip}
      />

      {/* 9. Admin Only: Penanda Tanggal Merah & Cuti Bersama */}
      {isAdmin && (
        <HolidayManagementModal
          isOpen={isHolidayModalOpen}
          onClose={() => setIsHolidayModalOpen(false)}
          holidays={holidays}
          onSaveHoliday={handleSaveHoliday}
          onDeleteHoliday={handleDeleteHoliday}
        />
      )}

      {/* 10. Admin Only: Backup & Restore Data (Satu Klik) */}
      {isAdmin && (
        <BackupRestoreModal
          isOpen={isBackupRestoreOpen}
          onClose={() => setIsBackupRestoreOpen(false)}
          departments={departments}
          employees={employees}
          trips={trips}
          holidays={holidays}
          activityLogs={activityLogs}
          onRestoreBackup={handleRestoreBackup}
          onRecordBackup={handleRecordBackup}
        />
      )}

    </div>
  );
}
