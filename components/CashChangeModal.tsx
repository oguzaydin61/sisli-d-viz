'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Banknote, X, Coins } from 'lucide-react';
import { formatCurrency, formatLiveNumericInput, parseFormattedNumber } from '@/lib/currency';

interface CashChangeModalProps {
  isOpen: boolean;
  totalTRY: number;
  onClose: () => void;
}

/**
 * F7 - Para Üstü Hesaplama Modalı
 * Açıldığında mevcut işlemin Genel Toplam Tutarı otomatik çekilir.
 * Tek input: "Müşteriden Alınan Tutar" -> Para Üstü anlık hesaplanır.
 * Enter veya ESC ile kapanır.
 */
export default function CashChangeModal({ isOpen, totalTRY, onClose }: CashChangeModalProps) {
  const [received, setReceived] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal her açıldığında inputu sıfırla ve otomatik odaklan
  useEffect(() => {
    if (isOpen) {
      setReceived('');
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const receivedNum = parseFormattedNumber(received);
  const hasValue = received.trim() !== '' && receivedNum > 0;
  const change = receivedNum - totalTRY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Banknote className="w-4 h-4 text-violet-400" />
            <span>Para Üstü Hesaplama</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 text-violet-300 font-mono text-[10px] font-bold border border-slate-700">
              F7
            </kbd>
          </div>
          <button
            onClick={onClose}
            type="button"
            title="Kapat (ESC)"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Genel Toplam (otomatik çekilir) */}
          <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3">
            <span className="text-[11px] uppercase font-bold tracking-widest text-slate-400">
              İşlem Genel Toplamı
            </span>
            <span className="text-xl font-black font-mono text-white tabular-nums">
              {formatCurrency(totalTRY, 'TRY')}
            </span>
          </div>

          {/* Müşteriden Alınan Tutar (tek input) */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold tracking-widest text-slate-400 block">
              Müşteriden Alınan Tutar
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={received}
              onChange={(e) => setReceived(formatLiveNumericInput(e.target.value, 2))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onClose();
                }
              }}
              placeholder="0,00"
              className="w-full bg-[#0d1527] border-2 border-violet-600/70 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-3 text-2xl font-black font-mono text-white text-right tabular-nums outline-none transition-all placeholder:text-slate-700"
            />
          </div>

          {/* Para Üstü Sonucu (anlık) */}
          <div
            className={`rounded-xl border px-4 py-4 flex flex-col items-center justify-center gap-1 min-h-[96px] transition-colors ${
              !hasValue
                ? 'bg-slate-950/50 border-slate-800'
                : change >= 0
                ? 'bg-emerald-950/40 border-emerald-700/70'
                : 'bg-rose-950/40 border-rose-700/70'
            }`}
          >
            {!hasValue ? (
              <span className="text-slate-500 text-sm font-semibold">
                Alınan tutarı girdiğinizde para üstü otomatik hesaplanır
              </span>
            ) : change >= 0 ? (
              <>
                <span className="text-[11px] uppercase font-bold tracking-widest text-emerald-400/90 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  PARA ÜSTÜ
                </span>
                <span className="text-4xl font-black font-mono text-emerald-400 tabular-nums tracking-tight">
                  {formatCurrency(change, 'TRY')}
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] uppercase font-bold tracking-widest text-rose-400/90">
                  EKSİK TUTAR
                </span>
                <span className="text-4xl font-black font-mono text-rose-400 tabular-nums tracking-tight">
                  {formatCurrency(Math.abs(change), 'TRY')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              Enter
            </kbd>{' '}
            /{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              ESC
            </kbd>{' '}
            ile kapat
          </span>
          <span>Anlık hesaplama aktif</span>
        </div>
      </div>
    </div>
  );
}
