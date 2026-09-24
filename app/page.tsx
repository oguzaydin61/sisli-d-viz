'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CashboxBalances,
  CurrencyItem,
  Transaction,
  TransactionItem,
  TransactionType
} from '@/lib/types';
import { CURRENCY_SYMBOLS, formatNumber } from '@/lib/currency';
import ExchangeTable, { ExchangeTableRef } from '@/components/ExchangeTable';
import LiveRatesBoard from '@/components/LiveRatesBoard';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';
import CashChangeModal from '@/components/CashChangeModal';
import { printTransactionReceipt } from '@/lib/receipt-print';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Receipt,
  Keyboard,
  RefreshCw,
  AlertCircle,
  Vault,
  CheckCircle2,
  Eye
} from 'lucide-react';

interface ToastState {
  kind: 'success' | 'error';
  message: string;
}

const CASHBOX_ORDER = ['TRY', 'USD', 'EUR'];

const CASHBOX_CHIP_STYLES: Record<string, string> = {
  TRY: 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300',
  USD: 'bg-sky-950/50 border-sky-800/60 text-sky-300',
  EUR: 'bg-amber-950/50 border-amber-800/60 text-amber-300'
};

export default function CashierPage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [cashbox, setCashbox] = useState<CashboxBalances>({ TRY: 0, USD: 0, EUR: 0 });
  const [mode, setMode] = useState<TransactionType>('BUY');
  const [receiptNumber, setReceiptNumber] = useState<string>('#004821');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Canlı tarih & saat
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Son kaydedilen işlem (önizleme / yeniden yazdırma)
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // F7 para üstü modalı
  const [isChangeModalOpen, setIsChangeModalOpen] = useState<boolean>(false);
  const [changeModalTotal, setChangeModalTotal] = useState<number>(0);

  // Toast bildirimi
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tableRef = useRef<ExchangeTableRef>(null);

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Saniye hassasiyetli canlı saat
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // İlk veri yüklemesi (kurlar + kasa + sıradaki fiş no)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Veriler yüklenemedi');
      }

      setCurrencies(json.data.currencies || []);
      if (json.data.cashbox) setCashbox(json.data.cashbox);
      if (json.data.nextReceiptId) setReceiptNumber(json.data.nextReceiptId);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // İşlem kaydı (F1: printReceipt=false -> fişsiz, F4: true -> kaydet + otomatik yazdır)
  const handleSubmitTransaction = async (
    items: TransactionItem[],
    grandTotal: number,
    printReceipt: boolean
  ) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          items,
          grandTotalTRY: grandTotal,
          operator: 'Gişe 1'
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'İşlem kaydedilemedi');
      }

      const savedTx: Transaction = json.data.transaction;
      setLastTransaction(savedTx);
      if (json.data.nextReceiptId) setReceiptNumber(json.data.nextReceiptId);
      if (json.data.cashbox) setCashbox(json.data.cashbox);

      if (printReceipt) {
        // F4: izole iframe belgesi olarak yazdır (tek sayfa 70x100mm, tek fiş)
        printTransactionReceipt(savedTx);
        showToast('success', `${savedTx.id} kaydedildi • Fiş yazdırılıyor...`);
      } else {
        // F1: Fişsiz kayıt (modal açılmaz)
        showToast('success', `${savedTx.id} fişsiz olarak kaydedildi.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İşlem sırasında hata oluştu';
      showToast('error', msg);
      throw err; // tablo satırları korunur
    } finally {
      setSubmitting(false);
    }
  };

  const anyModalOpen = isChangeModalOpen || isPreviewOpen;

  // F6: ALIŞ / SATIŞ modu arasında anında geçiş (kurlar tabloda otomatik yüklenir)
  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'BUY' ? 'SELL' : 'BUY'));
    setTimeout(() => tableRef.current?.focusFirstInput(), 60);
  }, []);

  // === KLAVYE KISAYOL HANDLER'LARI ===
  const handleF1 = () => {
    if (!anyModalOpen) tableRef.current?.triggerSubmit(false);
  };

  const handleF4 = () => {
    if (!anyModalOpen) tableRef.current?.triggerSubmit(true);
  };

  const handleF6 = () => {
    if (!anyModalOpen) toggleMode();
  };

  const handleF7 = () => {
    if (isPreviewOpen) return;
    if (isChangeModalOpen) {
      setIsChangeModalOpen(false);
      tableRef.current?.focusFirstInput();
    } else {
      // Mevcut işlemin Genel Toplam Tutarı otomatik çekilir
      setChangeModalTotal(tableRef.current?.getGrandTotal() ?? 0);
      setIsChangeModalOpen(true);
    }
  };

  const handleEscape = () => {
    if (isChangeModalOpen) {
      setIsChangeModalOpen(false);
      tableRef.current?.focusFirstInput();
    } else if (isPreviewOpen) {
      setIsPreviewOpen(false);
      tableRef.current?.focusFirstInput();
    } else {
      tableRef.current?.resetForm();
    }
  };

  useKeyboardShortcuts({
    onF1: handleF1,
    onF4: handleF4,
    onF6: handleF6,
    onF7: handleF7,
    onEscape: handleEscape
  });

  if (loading && currencies.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm font-bold font-mono">Döviz Gişe Otomasyonu Başlatılıyor...</p>
      </div>
    );
  }

  if (error && currencies.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-rose-400 gap-3">
        <AlertCircle className="w-10 h-10" />
        <p className="text-base font-bold">Veritabanı Bağlantı Hatası</p>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  const isBuy = mode === 'BUY';
  // Üst barda yalnızca 3 ana para birimi gösterilir: TRY, USD, EUR
  const cashboxCodes = CASHBOX_ORDER;

  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1400px] mx-auto w-full">
      {/* =================================================================== */}
      {/* ÜST BAR: SOL = Fiş No + Tarih/Saat • SAĞ = Toplam Kasa Bakiyesi     */}
      {/* =================================================================== */}
      <header className="bg-[#0b111e] border border-slate-800 rounded-2xl px-4 sm:px-5 py-3.5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* SOL: Fiş No + Tarih/Saat */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                FİŞ NO / İŞLEM NO
              </span>
              <span className="text-2xl font-black font-mono tracking-tight text-amber-400 tabular-nums">
                {receiptNumber}
              </span>
            </div>
          </div>

          <div className="h-11 w-px bg-slate-800" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                TARİH / SAAT
              </span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-xs text-slate-300 font-semibold">{currentDate}</span>
                <span className="text-xl font-black text-white tabular-nums tracking-wider">
                  {currentTime || '--:--:--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: Toplam Kasa Bakiyesi Kartı */}
        <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-xl px-5 py-3">
          <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            <Vault className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">
              TOPLAM KASA BAKİYESİ
            </span>
            <div className="flex items-center gap-2 font-mono flex-wrap">
              {cashboxCodes.map((code) => (
                <span
                  key={code}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 text-base font-black tabular-nums ${
                    CASHBOX_CHIP_STYLES[code] || 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-70">{code}</span>
                  {formatNumber(cashbox[code] ?? 0)} {CURRENCY_SYMBOLS[code] || code}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MOD SEÇİMİ: [ALIŞ İŞLEMİ] vs [SATIŞ İŞLEMİ] (F6 ile anında geçiş)   */}
      {/* =================================================================== */}
      <div className="relative grid grid-cols-2 gap-3 p-1.5 bg-[#080d1a] border border-slate-800 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={() => {
            setMode('BUY');
            tableRef.current?.focusFirstInput();
          }}
          className={`flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-black text-sm sm:text-base tracking-wider transition-all select-none ${
            isBuy
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/80 ring-2 ring-emerald-400 scale-[1.005]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ArrowDownLeft className={`w-6 h-6 ${isBuy ? 'text-white' : 'text-slate-500'}`} />
          <div className="text-left leading-tight">
            <span className="block font-black">ALIŞ İŞLEMİ</span>
            <span className="text-[10px] font-medium opacity-80 block tracking-normal">
              (Biz Müşteriden Döviz Alıyoruz • Kasaya Giriş)
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('SELL');
            tableRef.current?.focusFirstInput();
          }}
          className={`flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-black text-sm sm:text-base tracking-wider transition-all select-none ${
            !isBuy
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/80 ring-2 ring-rose-400 scale-[1.005]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <ArrowUpRight className={`w-6 h-6 ${!isBuy ? 'text-white' : 'text-slate-500'}`} />
          <div className="text-left leading-tight">
            <span className="block font-black">SATIŞ İŞLEMİ</span>
            <span className="text-[10px] font-medium opacity-80 block tracking-normal">
              (Biz Müşteriye Döviz Satıyoruz • Kasadan Çıkış)
            </span>
          </div>
        </button>

        {/* F6 kısayol rozeti */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
          <kbd
            title="F6: Alış/Satış modu arasında geçiş yap"
            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-600 text-amber-400 font-mono text-[11px] font-black shadow-xl"
          >
            F6
          </kbd>
        </div>
      </div>


      {/* =================================================================== */}
      {/* ORTA BÖLÜM: 5 KOLONLU DİNAMİK İŞLEM TABLOSU                          */}
      {/* =================================================================== */}
      <ExchangeTable
        ref={tableRef}
        currencies={currencies}
        mode={mode}
        receiptNumber={receiptNumber}
        onSubmitTransaction={handleSubmitTransaction}
        loading={submitting}
      />

      {/* =================================================================== */}
      {/* ALT BÖLÜM: CANLI ALIŞ/SATIŞ KUR TAHTASI                              */}
      {/* =================================================================== */}
      <LiveRatesBoard
        currencies={currencies}
        activeMode={mode}
        onSelectCurrency={(code) => tableRef.current?.applyCurrencyCode(code)}
        onRatesUpdated={(updated) => setCurrencies(updated)}
      />

      {/* =================================================================== */}
      {/* KLAVYE KISAYOLLARI BARı                                              */}
      {/* =================================================================== */}
      <div className="bg-[#080d1a] border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Kısayollar:</span>
          </div>

          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono font-bold text-xs border border-slate-700 shadow-sm">
              F1
            </kbd>
            <span className="text-slate-300 font-semibold text-[11px]">Fişsiz Kaydet</span>
          </span>

          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono font-bold text-xs border border-slate-700 shadow-sm">
              F4
            </kbd>
            <span className="text-slate-300 font-semibold text-[11px]">Kaydet & Fiş Yazdır</span>
          </span>

          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-slate-900 text-sky-400 font-mono font-bold text-xs border border-slate-700 shadow-sm">
              F6
            </kbd>
            <span className="text-slate-300 font-semibold text-[11px]">Alış/Satış Değiştir</span>
          </span>

          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-slate-900 text-violet-400 font-mono font-bold text-xs border border-slate-700 shadow-sm">
              F7
            </kbd>
            <span className="text-slate-300 font-semibold text-[11px]">Para Üstü</span>
          </span>

          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-slate-900 text-rose-400 font-mono font-bold text-xs border border-slate-700 shadow-sm">
              ESC
            </kbd>
            <span className="text-slate-300 font-semibold text-[11px]">Sıfırla / Kapat</span>
          </span>
        </div>

        <button
          type="button"
          disabled={!lastTransaction}
          onClick={() => setIsPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <span>
            Son Fişi Önizle{lastTransaction ? ` (${lastTransaction.id})` : ''}
          </span>
        </button>
      </div>

      {/* F7: Para Üstü Hesaplama Modalı */}
      <CashChangeModal
        isOpen={isChangeModalOpen}
        totalTRY={changeModalTotal}
        onClose={() => {
          setIsChangeModalOpen(false);
          tableRef.current?.focusFirstInput();
        }}
      />

      {/* Son Fiş Önizleme / Yeniden Yazdırma Modalı */}
      <ThermalReceiptModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          tableRef.current?.focusFirstInput();
        }}
        transaction={lastTransaction}
      />

      {/* Toast Bildirimi */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            toast.kind === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

