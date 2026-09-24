import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'BİMAY DÖVİZ - Ön Büro & Cari Otomasyonu',
  description: 'Masaüstü hızında modern döviz ön büro, cari ve kasa otomasyonu'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark h-full">
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

