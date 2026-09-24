'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CurrencyItem, Transaction } from '@/lib/types';
import { formatCurrency, formatNumber, formatRate } from '@/lib/currency';
import { Sigma, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface AvgRow {
  code: string;
  title: string;
  buyQty: number;
  buyTRY: number;
  avgBuy: number | null;
  sellQty: number;
  sellTRY: number;
  avgSell: number | null;
}

const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function AverageRatePage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const todayYMD = toLocalYMD(new Date());
  const todayLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Veriler yüklenemedi');
      setCurrencies(json.data.currencies || []);
      setTransactions(json.data.transactions || []);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Bugünün AKTİF alış/satış işlemleri (CROSS işlemler TL içermediği için hariç)
  const todayTx = transactions.filter(
    (t) =>
      t.status === 'ACTIVE' &&
      (t.type === 'BUY' || t.type === 'SELL') &&
      toLocalYMD(new Date(t.date)) === todayYMD
  );

  const rows: AvgRow[] = currencies.map((c) => {
    let buyQty = 0;
    let buyTRY = 0;
    let sellQty = 0;
    let sellTRY = 0;

    for (const t of todayTx) {
      for (const item of t.items) {
        if (item.code !== c.code) continue;
        if (t.type === 'BUY') {
          buyQty += item.amount;
          buyTRY += item.totalTRY;
        } else {
          sellQty += item.amount;
          sellTRY += item.totalTRY;
        }
      }
    }

    return {
      code: c.code,
      title: c.title,
      buyQty,
      buyTRY,
      avgBuy: buyQty > 0 ? buyTRY / buyQty : null,
      sellQty,
      sellTRY,
      avgSell: sellQty > 0 ? sellTRY / sellQty : null
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      buyTRY: acc.buyTRY + r.buyTRY,
      sellTRY: acc.sellTRY + r.sellTRY
    }),
    { buyTRY: 0, sellTRY: 0 }
  );

  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1200px] mx-auto w-full">
      {/* Başlık */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sky-400">
            <Sigma className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Ortalama Kur Raporu</h1>
            <p className="text-[11px] text-slate-400">
              <span className="text-sky-300 font-semibold">{todayLabel}</span> • Ağırlıklı Ortalama =
              Toplam TL Tutarı ÷ Toplam Döviz Miktarı
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

      {/* Günlük Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-emerald-950/50 to-[#0b111e] border border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400/80 block">
              Bugünkü Toplam Alış (TL)
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
              {formatCurrency(totals.buyTRY, 'TRY')}
            </span>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500/50" />
        </div>
        <div className="bg-gradient-to-br from-rose-950/50 to-[#0b111e] border border-rose-800/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400/80 block">
              Bugünkü Toplam Satış (TL)
            </span>
            <span className="text-2xl font-black font-mono text-rose-400 tabular-nums">
              {formatCurrency(totals.sellTRY, 'TRY')}
            </span>
          </div>
          <TrendingDown className="w-8 h-8 text-rose-500/50" />
        </div>
      </div>

      {/* Ortalama Kur Tablosu */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              <th className="px-3 py-1.5">Sembol</th>
              <th className="px-3 py-1.5 text-right">Alış Miktarı</th>
              <th className="px-3 py-1.5 text-right">Alış Toplam TL</th>
              <th className="px-3 py-1.5 text-right">Ort. Alış Kuru</th>
              <th className="px-3 py-1.5 text-right">Satış Miktarı</th>
              <th className="px-3 py-1.5 text-right">Satış Toplam TL</th>
              <th className="px-3 py-1.5 text-right">Ort. Satış Kuru</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="bg-slate-950/80 rounded-xl">
                <td className="px-3 py-2.5">
                  <span className="px-2 py-1 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400 font-mono font-black text-xs">
                    {r.code}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-2 hidden sm:inline">{r.title}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                  {r.buyQty > 0 ? formatNumber(r.buyQty) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                  {r.buyTRY > 0 ? formatCurrency(r.buyTRY, 'TRY') : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-emerald-400 tabular-nums">
                  {r.avgBuy !== null ? formatRate(r.avgBuy) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                  {r.sellQty > 0 ? formatNumber(r.sellQty) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                  {r.sellTRY > 0 ? formatCurrency(r.sellTRY, 'TRY') : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-rose-400 tabular-nums">
                  {r.avgSell !== null ? formatRate(r.avgSell) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {todayTx.length === 0 && (
          <p className="text-xs text-slate-500 font-mono py-4 text-center">
            Bugün henüz alış/satış işlemi yapılmadı.
          </p>
        )}
      </div>
    </div>
  );
}

