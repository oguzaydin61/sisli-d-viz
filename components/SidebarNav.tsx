'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Coins,
  PieChart,
  Shuffle,
  Wallet,
  Sigma,
  History,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Ön Büro / Gişe', icon: ArrowLeftRight, exact: true },
  { href: '/kurlar', label: 'Kur Yönetimi', icon: Coins, exact: false },
  { href: '/analiz', label: 'Kasa Analiz Raporları', icon: PieChart, exact: false },
  { href: '/arbitraj', label: 'Arbitraj / Cross Exchange', icon: Shuffle, exact: false },
  { href: '/masraf', label: 'Kasa Giriş / Çıkış & Masraf', icon: Wallet, exact: false },
  { href: '/ortalama-kur', label: 'Ortalama Kur Raporu', icon: Sigma, exact: false },
  { href: '/gecmis', label: 'Günlük İşlem Geçmişi', icon: History, exact: false }
];

interface SidebarNavProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* ===================== MASAÜSTÜ: SOL SABİT SIDEBAR ===================== */}
      <aside
        className={`fixed left-0 top-0 h-screen z-40 hidden lg:flex flex-col bg-[#080d1a] border-r border-slate-800 transition-all duration-300 select-none ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800/80 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-lg tracking-wider shadow-md shadow-amber-950/60 shrink-0">
            B
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-black tracking-tight text-sm text-white font-mono truncate block">
                BİMAY DÖVİZ
              </span>
              <p className="text-[10px] text-slate-500 font-mono truncate">Ön Büro Otomasyonu</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all group ${
                  active
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-amber-400" />
                )}
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>


        {/* Footer: durum + tema + daralt */}
        <div className="border-t border-slate-800/80 p-2.5 space-y-1 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono font-bold">Gişe 1 Aktif</span>
            </div>
          )}

          <button
            onClick={onToggle}
            type="button"
            title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            {collapsed ? (
              <ChevronsRight className="w-5 h-5 shrink-0" />
            ) : (
              <ChevronsLeft className="w-5 h-5 shrink-0" />
            )}
            {!collapsed && <span>Menüyü Daralt</span>}
          </button>
        </div>
      </aside>

      {/* ===================== MOBİL: ÜST YATAY NAV ===================== */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#080d1a] border-b border-slate-800 select-none">
        <div className="flex items-center gap-3 px-3 h-12 border-b border-slate-800/60">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-sm shrink-0">
            B
          </div>
          <span className="font-black tracking-tight text-sm text-white font-mono">
            BİMAY DÖVİZ
          </span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
