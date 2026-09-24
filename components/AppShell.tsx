'use client';

import React, { useEffect, useState } from 'react';
import SidebarNav from './SidebarNav';
import ThemeToggle from './ThemeToggle';

const STORAGE_KEY = 'bimay_sidebar_collapsed';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SidebarNav collapsed={collapsed} onToggle={toggle} />
      <main
        className={`flex flex-col min-h-screen transition-all duration-300 px-3 sm:px-6 py-4 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto">
          {/* Sağ üst köşe: Light/Dark tema geçişi */}
          <div className="flex justify-end mb-2">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
