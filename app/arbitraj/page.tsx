'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CashboxBalances, CurrencyItem, Transaction } from '@/lib/types';
import {
  CURRENCY_SYMBOLS,
  formatLiveNumericInput,
  formatNumber,
  formatRate,
  parseFormattedNumber,
  parseRateInput,
  sanitizeRateInput
} from '@/lib/currency';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { Shuffle, RefreshCw, ArrowRight, AlertCircle, Check, Repeat2, Eraser } from 'lucide-react';

export default function ArbitragePage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [cashbox, setCashbox] = useState<CashboxBalances>({ TRY: 0, USD: 0, EUR: 0 });
  const [crossHistory, setCrossHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('EUR');
  const [fromAmount, setFromAmount] = useState('');
  const [crossRate, setCrossRate] = useState('');
  const [toAmount, setToAmount] = useState('');

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);
  const toAmountRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((kind: 'success' | 'error', text: string) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 4500);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Veriler yüklenemedi');
      setCurrencies(json.data.currencies || []);
      setCashbox(json.data.cashbox || { TRY: 0, USD: 0, EUR: 0 });
      setCrossHistory(
        (json.data.transactions || []).filter((t: Transaction) => t.type === 'CROSS').slice(0, 8)
      );
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fromCur = currencies.find((c) => c.code === fromCode);
  const toCur = currencies.find((c) => c.code === toCode);
  const sameCurrency = fromCode === toCode;

  // Varsayılan Çapraz Kur = Alınan Döviz Kuru / Verilen Döviz Kuru
  // (Verilen için gişe ALIŞ, alınan için gişe SATIŞ baz alınır.)
  // Aynı para birimi seçilirse oran birebir 1.0000 olur.
  useEffect(() => {
    if (!fromCur || !toCur) return;
    const cr = sameCurrency ? 1 : fromCur.buy > 0 ? toCur.sell / fromCur.buy : 0;
    setCrossRate(cr.toFixed(6));
    const amt = parseFormattedNumber(fromAmount);
    setToAmount(amt > 0 && cr > 0 ? formatNumber(amt / cr, 2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCode, toCode, currencies]);

  const recomputeToAmount = (amountStr: string, crStr: string) => {
    const amt = parseFormattedNumber(amountStr);
    const cr = parseRateInput(crStr);
    return amt > 0 && cr > 0 ? formatNumber(amt / cr, 2) : '';
  };

  const handleFromAmount = (v: string) => {
    const f = formatLiveNumericInput(v, 2);
    setFromAmount(f);
    setToAmount(recomputeToAmount(f, crossRate));
  };

  // Çapraz kur elle düzenlenebilir / yuvarlanabilir
  const handleCrossRate = (v: string) => {
    const s = sanitizeRateInput(v);
    setCrossRate(s);
    setToAmount(recomputeToAmount(fromAmount, s));
  };

  // Alınan miktar elle değişirse çapraz kur geri hesaplanır
  const handleToAmount = (v: string) => {
    const f = formatLiveNumericInput(v, 2);
    setToAmount(f);
    const amt = parseFormattedNumber(fromAmount);
    const ta = parseFormattedNumber(f);
    if (amt > 0 && ta > 0) setCrossRate((amt / ta).toFixed(6));
  };

  const handleSwapCodes = () => {
    setFromCode(toCode);
    setToCode(fromCode);
    setFromAmount('');
    setToAmount('');
  };

  const resetForm = useCallback(() => {
    setFromAmount('');
    setToAmount('');
    if (fromCur && toCur) {
      const cr = sameCurrency ? 1 : fromCur.buy > 0 ? toCur.sell / fromCur.buy : 0;
      setCrossRate(cr.toFixed(6));
    }
    setTimeout(() => amountRef.current?.focus(), 60);
  }, [fromCur, toCur, sameCurrency]);

  const fromAmountNum = parseFormattedNumber(fromAmount);
  const toAmountNum = parseFormattedNumber(toAmount);
  const crossRateNum = parseRateInput(crossRate);
  const fromRateTL = fromCur ? fromCur.buy : 0; // verilen döviz: gişe alış
  const toRateTL =
    fromRateTL > 0 && crossRateNum > 0 ? Number((fromRateTL * crossRateNum).toFixed(6)) : 0; // alınan: türetilmiş
  const availableFrom = cashbox[fromCode] || 0;
  const insufficient = fromAmountNum > 0 && fromAmountNum > availableFrom;

  const handleSubmit = useCallback(async () => {
    if (sameCurrency) return notify('error', 'Aynı para birimi arasında takas yapılamaz.');
    if (fromAmountNum <= 0) return notify('error', 'Verilen miktar giriniz.');
    if (crossRateNum <= 0) return notify('error', 'Çapraz kur 0’dan büyük olmalıdır.');
    if (toAmountNum <= 0) return notify('error', 'Alınan miktar hesaplanamadı.');
    if (insufficient) {
      return notify(
        'error',
        `Yetersiz Kasa Bakiyesi: Kasada ${formatNumber(availableFrom)} ${fromCode} bulunmaktadır`
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CROSS',
          cross: {
            fromCode,
            fromAmount: fromAmountNum,
            fromRate: fromRateTL,
            toCode,
            toAmount: toAmountNum,
            toRate: toRateTL
          },
          operator: 'Gişe 1'
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'İşlem kaydedilemedi');
      setCashbox(json.data.cashbox);
      notify('success', json.message || 'Çapraz işlem kaydedildi.');
      setFromAmount('');
      setToAmount('');
      load();
      setTimeout(() => amountRef.current?.focus(), 80);
    } catch (e: unknown) {
      notify('error', e instanceof Error ? e.message : 'İşlem hatası');
    } finally {
      setSubmitting(false);
    }
  }, [
    sameCurrency, fromAmountNum, crossRateNum, toAmountNum, insufficient,
    availableFrom, fromCode, toCode, fromRateTL, toRateTL, notify, load
  ]);

  // Klavye: F4 (veya F2) = Onayla, ESC = Temizle
  useKeyboardShortcuts({
    onF4: () => handleSubmit(),
    onEscape: () => resetForm()
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSubmit]);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1100px] mx-auto w-full">
      {/* Başlık */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-violet-400">
            <Shuffle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Arbitraj / Cross Exchange</h1>
            <p className="text-[11px] text-slate-400">
              TL girmeden doğrudan döviz ↔ döviz değişimi • Çapraz Kur = Alınan Kur ÷ Verilen Kur
            </p>
          </div>
        </div>
        <button
          onClick={load}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Bildirim */}
      {message && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            message.kind === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          {message.kind === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}


      {/* GİŞE DÜZENİ: SOL Verilen • SAĞ Alınan */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          {/* SOL: VERİLEN DÖVİZ */}
          <div className="bg-rose-950/20 border border-rose-800/50 rounded-2xl p-4 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-400 block">
              VERİLEN DÖVİZ (Kasadan Çıkar)
            </span>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Sembol
              </label>
              <select
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value)}
                className="w-full bg-[#0d1527] border-2 border-rose-700/60 rounded-lg px-3 py-2.5 text-base font-black font-mono text-rose-300 outline-none"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Miktar
              </label>
              <input
                ref={amountRef}
                value={fromAmount}
                onChange={(e) => handleFromAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    toAmountRef.current?.focus();
                    toAmountRef.current?.select();
                  }
                }}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                className="w-full bg-[#0d1527] border-2 border-rose-700/60 focus:border-rose-400 rounded-lg px-3 py-2.5 text-xl font-black font-mono text-white text-right outline-none tabular-nums placeholder:text-slate-600"
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Kasada mevcut:{' '}
              <strong className={insufficient ? 'text-rose-400' : 'text-slate-200'}>
                {formatNumber(availableFrom)} {CURRENCY_SYMBOLS[fromCode] || fromCode}
              </strong>
              {insufficient && (
                <span className="text-rose-400 font-black block mt-0.5">
                  ⚠ Yetersiz Kasa Bakiyesi
                </span>
              )}
              {sameCurrency && (
                <span className="text-amber-400 font-bold block mt-0.5">
                  Aynı birim seçildi • oran birebir 1,0000
                </span>
              )}
            </div>
          </div>

          {/* ORTA: yön çevirme */}
          <div className="flex lg:flex-col items-center justify-center gap-2">
            <button
              onClick={handleSwapCodes}
              type="button"
              title="Yönü Tersine Çevir"
              className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-violet-400 transition-all hover:rotate-180"
            >
              <Repeat2 className="w-5 h-5" />
            </button>
            <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 lg:rotate-0" />
          </div>


          {/* SAĞ: ALINAN DÖVİZ */}
          <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-2xl p-4 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block">
              ALINAN DÖVİZ (Kasaya Girer)
            </span>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Sembol
              </label>
              <select
                value={toCode}
                onChange={(e) => setToCode(e.target.value)}
                className="w-full bg-[#0d1527] border-2 border-emerald-700/60 rounded-lg px-3 py-2.5 text-base font-black font-mono text-emerald-300 outline-none"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Hesaplanan Miktar (editlenebilir)
              </label>
              <input
                ref={toAmountRef}
                value={toAmount}
                onChange={(e) => handleToAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                className="w-full bg-[#0d1527] border-2 border-emerald-700/60 focus:border-emerald-400 rounded-lg px-3 py-2.5 text-xl font-black font-mono text-emerald-300 text-right outline-none tabular-nums placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Çapraz Kur (editlenebilir / yuvarlanabilir)
              </label>
              <input
                value={crossRate}
                onChange={(e) => handleCrossRate(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm font-black font-mono text-amber-300 text-right outline-none tabular-nums"
              />
              <span className="text-[10px] font-mono text-slate-500 block mt-1">
                1 {toCode} = {formatRate(crossRateNum)} {fromCode} • {fromCode} Alış:{' '}
                {formatRate(fromRateTL)} • {toCode} Satış: {formatRate(toCur?.sell || 0)}
              </span>
            </div>
          </div>
        </div>


        {/* Aksiyonlar: Onayla [F4/F2] + Temizle [ESC] */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || insufficient || sameCurrency}
            type="button"
            className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl shadow-violet-950/60 ring-2 ring-violet-400/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            <Shuffle className="w-5 h-5" />
            <span>
              {submitting
                ? 'İŞLEM KAYDEDİLİYOR...'
                : `ÇAPRAZ İŞLEMİ ONAYLA [F4] — ${formatNumber(fromAmountNum)} ${fromCode} → ${formatNumber(toAmountNum)} ${toCode}`}
            </span>
          </button>
          <button
            onClick={resetForm}
            type="button"
            className="px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border-2 border-slate-600 font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Eraser className="w-4 h-4 text-rose-400" />
            <span>TEMİZLE [ESC]</span>
          </button>
        </div>
      </div>

      {/* Son Çapraz İşlemler */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
          <Shuffle className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Son Çapraz İşlemler
          </span>
        </div>
        {crossHistory.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-3 text-center">
            Henüz çapraz işlem yapılmadı.
          </p>
        ) : (
          <div className="space-y-1.5">
            {crossHistory.map((t) =>
              t.cross ? (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/70 rounded-xl px-3 py-2 text-xs font-mono"
                >
                  <span className="text-amber-400 font-black">{t.id}</span>
                  <span className="text-slate-400">
                    {new Date(t.date).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-rose-300 font-bold">
                    −{formatNumber(t.cross.fromAmount)} {t.cross.fromCode}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-emerald-300 font-bold">
                    +{formatNumber(t.cross.toAmount)} {t.cross.toCode}
                  </span>
                  <span className="text-slate-500">@ {formatRate(t.cross.crossRate)}</span>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

