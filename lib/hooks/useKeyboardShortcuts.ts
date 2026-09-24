'use client';

import { useEffect } from 'react';

export interface ShortcutHandlers {
  onF1?: () => void; // Fişsiz Kaydet (yazıcı modalı açmadan işler + formu sıfırlar)
  onF4?: () => void; // Kaydet & Otomatik Fiş Yazdır (window.print)
  onF6?: () => void; // ALIŞ / SATIŞ modu değiştir
  onF7?: () => void; // Para Üstü Hesaplama Modalı
  onEscape?: () => void; // Formu Sıfırla / Modal Kapat
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept browser developer tools (F12)
      switch (e.key) {
        case 'F1':
          e.preventDefault(); // Tarayıcı yardım penceresini engelle
          handlers.onF1?.();
          break;
        case 'F4':
          e.preventDefault();
          handlers.onF4?.();
          break;
        case 'F6':
          e.preventDefault(); // Tarayıcı adres çubuğu odağını engelle
          handlers.onF6?.();
          break;
        case 'F7':
          e.preventDefault(); // Tarayıcı caret-browsing uyarısını engelle
          handlers.onF7?.();
          break;
        case 'Escape':
          handlers.onEscape?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}
