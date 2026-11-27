import React from 'react';
import { Department } from '../types/trip';

/**
 * Returns inline CSS style for Department badge if custom hexColor is set,
 * or undefined so standard Tailwind classes apply.
 */
export function getDeptBadgeStyle(dept?: Department): React.CSSProperties | undefined {
  if (!dept?.color?.hexColor) return undefined;
  return {
    backgroundColor: dept.color.hexColor,
    color: '#ffffff',
  };
}

/**
 * Returns inline CSS style for Department dot indicator.
 */
export function getDeptDotStyle(dept?: Department): React.CSSProperties | undefined {
  if (!dept?.color?.hexColor) return undefined;
  return {
    backgroundColor: dept.color.hexColor,
  };
}

/**
 * Popular color presets for Bidang / Department labels
 */
export const PRESET_DEPARTMENT_COLORS = [
  { label: 'Biru (Sekretariat)', hex: '#2563EB', badgeBg: 'bg-blue-600 text-white', dotBg: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { label: 'Indigo (Perencanaan)', hex: '#4F46E5', badgeBg: 'bg-indigo-600 text-white', dotBg: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { label: 'Hijau Zamrud (Keuangan)', hex: '#059669', badgeBg: 'bg-emerald-600 text-white', dotBg: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { label: 'Sian / Teal (Teknologi TI)', hex: '#0891B2', badgeBg: 'bg-cyan-600 text-white', dotBg: 'bg-cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { label: 'Kuning / Amber (Operasional PPK)', hex: '#D97706', badgeBg: 'bg-amber-600 text-white', dotBg: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  { label: 'Merah Cerah (Inspektorat)', hex: '#E11D48', badgeBg: 'bg-rose-600 text-white', dotBg: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  { label: 'Ungu (Hukum & Organisasi)', hex: '#7C3AED', badgeBg: 'bg-purple-600 text-white', dotBg: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { label: 'Jingga / Oranye (Sarana)', hex: '#EA580C', badgeBg: 'bg-orange-600 text-white', dotBg: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { label: 'Teal (Pemberdayaan)', hex: '#0D9488', badgeBg: 'bg-teal-600 text-white', dotBg: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  { label: 'Fuchsia / Magenta (Humas)', hex: '#C026D3', badgeBg: 'bg-fuchsia-600 text-white', dotBg: 'bg-fuchsia-500', text: 'text-fuchsia-700', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  { label: 'Lime / Hijau Daun (Pertanian)', hex: '#65A30D', badgeBg: 'bg-lime-600 text-white', dotBg: 'bg-lime-500', text: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200' },
  { label: 'Abu-Abu Arang (Umum / TU)', hex: '#334155', badgeBg: 'bg-slate-700 text-white', dotBg: 'bg-slate-500', text: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' },
];

/**
 * 16 Quick swatches for custom color picker
 */
export const QUICK_COLOR_SWATCHES = [
  '#2563EB', '#3B82F6', '#0284C7', '#0891B2',
  '#0D9488', '#059669', '#16A34A', '#65A30D',
  '#D97706', '#EA580C', '#E11D48', '#DC2626',
  '#7C3AED', '#9333EA', '#C026D3', '#334155'
];
