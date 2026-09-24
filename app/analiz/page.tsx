'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CashboxBalances, CurrencyItem } from '@/lib/types';
import { CURRENCY_SYMBOLS, formatNumber, formatRate } from '@/lib/currency';
import { PieChart, RefreshCw, Banknote, DollarSign, Euro, Vault } from 'lucide-react';

interface AnalysisRow {
  code: string;
  title: string;
  amount: number;
  buyRate: number; // TRY için 1
  valueTRY: number;
}

export default function AnalysisPage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [cashbox, setCashbox] = useState<CashboxBalances>({ TRY: 0, USD: 0, EUR: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Veriler yüklenemedi');
      setCurrencies(json.data.currencies || []);
      setCashbox(json.data.cashbox || { TRY: 0, USD: 0, EUR: 0 });
    } catch {
      // sessiz: tablo boş kalır
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // === DEĞERLEME: Tüm varlıklar ALIŞ KURLARI üzerinden TL'ye çevrilir ===
  const rows: AnalysisRow[] = [];

  // TRY kasası
  rows.push({
    code: 'TRY',
    title: 'Türk Lirası',
    amount: cashbox.TRY || 0,
    buyRate: 1,
    valueTRY: cashbox.TRY || 0
  });

  // Tanımlı dövizler
  for (const c of currencies) {
    const amount = cashbox[c.code] || 0;
    rows.push({
      code: c.code,
      title: c.title,
      amount,
      buyRate: c.buy,
      valueTRY: amount * c.buy
    });
  }

  // currencies listesinde olmayan ekstra kasa hesapları (varsa)
  const knownCodes = new Set(['TRY', ...currencies.map((c) => c.code)]);
  for (const code of Object.keys(cashbox)) {
    if (!knownCodes.has(code)) {
      const amount = cashbox[code] || 0;
      rows.push({ code, title: 'Tanımsız Para Birimi', amount, buyRate: 0, valueTRY: 0 });
    }
  }

  const totalTRY = rows.reduce((sum, r) => sum + r.valueTRY, 0);

  const usdBuy = currencies.find((c) => c.code === 'USD')?.buy || 0;
  const eurBuy = currencies.find((c) => c.code === 'EUR')?.buy || 0;
  const totalInUSD = usdBuy > 0 ? totalTRY / usdBuy : 0;
  const totalInEUR = eurBuy > 0 ? totalTRY / eurBuy : 0;

  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1100px] mx-auto w-full">
      {/* Başlık */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Kasa Analiz Raporları</h1>
            <p className="text-[11px] text-slate-400">
              Değerleme: tüm varlıklar güncel ALIŞ kurları üzerinden hesaplanır.
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

      {/* Toplam Değer Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-950/60 to-[#0b111e] border border-emerald-800/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400/80">
              Toplam Kasa Değeri
            </span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums tracking-tight">
            {formatNumber(totalTRY)} ₺
          </div>
          <span className="text-[10px] text-slate-500 font-mono">TL cinsinden</span>
        </div>

        <div className="bg-gradient-to-br from-sky-950/60 to-[#0b111e] border border-sky-800/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400/80">
              Toplam Kasa Değeri
            </span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-sky-400 tabular-nums tracking-tight">
            {formatNumber(totalInUSD)} $
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            USD cinsinden (Alış: {formatRate(usdBuy)})
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-950/60 to-[#0b111e] border border-amber-800/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80">
              Toplam Kasa Değeri
            </span>
            <Euro className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400 tabular-nums tracking-tight">
            {formatNumber(totalInEUR)} €
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            EUR cinsinden (Alış: {formatRate(eurBuy)})
          </span>
        </div>
      </div>


      {/* Nakit Dağılım Tablosu */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-x-auto">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
          <Vault className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Kasadaki Fiziksel Nakit Dağılımı
          </span>
        </div>
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              <th className="px-3 py-1.5 w-[100px]">Birim</th>
              <th className="px-3 py-1.5">Açıklama</th>
              <th className="px-3 py-1.5 text-right">Kasadaki Miktar</th>
              <th className="px-3 py-1.5 text-right">Alış Kuru</th>
              <th className="px-3 py-1.5 text-right">TL Değeri</th>
              <th className="px-3 py-1.5 w-[200px]">Pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const share = totalTRY > 0 ? (r.valueTRY / totalTRY) * 100 : 0;
              return (
                <tr key={r.code} className="bg-slate-950/80 rounded-xl">
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-1 rounded-md font-mono font-black text-xs border ${
                        r.code === 'TRY'
                          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                          : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                      }`}
                    >
                      {r.code}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-slate-200">{r.title}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-white tabular-nums">
                    {formatNumber(r.amount)} {CURRENCY_SYMBOLS[r.code] || ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-400 tabular-nums">
                    {r.code === 'TRY' ? '—' : r.buyRate > 0 ? formatRate(r.buyRate) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-emerald-300 tabular-nums">
                    {formatNumber(r.valueTRY)} ₺
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            r.code === 'TRY' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-12 text-right tabular-nums">
                        %{formatNumber(share, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700">
              <td colSpan={4} className="px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-300">
                GENEL TOPLAM
              </td>
              <td className="px-3 py-3 text-right font-mono font-black text-base text-emerald-400 tabular-nums">
                {formatNumber(totalTRY)} ₺
              </td>
              <td className="px-3 py-3 text-right font-mono text-[10px] text-slate-500">%100</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

