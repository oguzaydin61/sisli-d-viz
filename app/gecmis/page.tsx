'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CashboxBalances, ExpenseEntry, Transaction } from '@/lib/types';
import { CURRENCY_SYMBOLS, formatCurrency, formatNumber, formatRate } from '@/lib/currency';
import { History, RefreshCw, AlertCircle, Check, Trash2, CalendarDays, ArrowRight } from 'lucide-react';

type TypeFilter = 'ALL' | 'BUY' | 'SELL' | 'CROSS' | 'EXP';

interface HistoryRow {
  key: string;
  id: string;
  date: string;
  kind: 'BUY' | 'SELL' | 'CROSS' | 'EXP_IN' | 'EXP_OUT';
  source: 'transaction' | 'expense';
  title: string;
  detail: string;
  effects: { text: string; positive: boolean }[];
}

const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const KIND_STYLES: Record<HistoryRow['kind'], { label: string; cls: string }> = {
  BUY: { label: 'ALIŞ', cls: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400' },
  SELL: { label: 'SATIŞ', cls: 'bg-rose-950/60 border-rose-800/60 text-rose-400' },
  CROSS: { label: 'ARBITRAJ', cls: 'bg-violet-950/60 border-violet-800/60 text-violet-400' },
  EXP_IN: { label: 'KASA GİRİŞ', cls: 'bg-sky-950/60 border-sky-800/60 text-sky-400' },
  EXP_OUT: { label: 'MASRAF', cls: 'bg-orange-950/60 border-orange-800/60 text-orange-400' }
};

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [cashbox, setCashbox] = useState<CashboxBalances>({ TRY: 0, USD: 0, EUR: 0 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [startDate, setStartDate] = useState(toLocalYMD(new Date()));
  const [endDate, setEndDate] = useState(toLocalYMD(new Date()));
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const notify = useCallback((kind: 'success' | 'error', text: string) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Veriler yüklenemedi');
      setTransactions(json.data.transactions || []);
      setExpenses(json.data.expenses || []);
      setCashbox(json.data.cashbox || { TRY: 0, USD: 0, EUR: 0 });
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // === İPTAL / SİL: kasa etkisi API tarafında otomatik geri alınır ===
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm(`${id} numaralı işlem iptal edilsin mi?\nKasaya yaptığı etki otomatik geri alınır.`)) return;
    try {
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'İptal edilemedi');
      setCashbox(json.data.cashbox);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      notify('success', json.message);
    } catch (e: unknown) {
      notify('error', e instanceof Error ? e.message : 'İptal hatası');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm(`${id} numaralı kasa hareketi iptal edilsin mi?\nKasa etkisi geri alınır.`)) return;
    try {
      const res = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'İptal edilemedi');
      setCashbox(json.data.cashbox);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      notify('success', json.message);
    } catch (e: unknown) {
      notify('error', e instanceof Error ? e.message : 'İptal hatası');
    }
  };

  // === BİRLEŞİK GEÇMİŞ MODELİ ===
  const txRows: HistoryRow[] = transactions.map((t) => {
    if (t.type === 'CROSS' && t.cross) {
      return {
        key: `tx-${t.id}`,
        id: t.id,
        date: t.date,
        kind: 'CROSS',
        source: 'transaction',
        title: `${t.cross.fromCode} → ${t.cross.toCode} Çapraz Değişim`,
        detail: `Çapraz kur: 1 ${t.cross.fromCode} = ${formatRate(t.cross.crossRate)} ${t.cross.toCode} • Ref: ${formatCurrency(t.grandTotalTRY, 'TRY')}`,
        effects: [
          { text: `−${formatNumber(t.cross.fromAmount)} ${t.cross.fromCode}`, positive: false },
          { text: `+${formatNumber(t.cross.toAmount)} ${t.cross.toCode}`, positive: true }
        ]
      };
    }

    const fxText = t.items.map((i) => `${formatNumber(i.amount)} ${i.code}`).join(', ');
    const rateText = t.items.map((i) => `${i.code} @ ${formatRate(i.rate)}`).join(' • ');
    const isBuy = t.type === 'BUY';

    return {
      key: `tx-${t.id}`,
      id: t.id,
      date: t.date,
      kind: t.type as 'BUY' | 'SELL',
      source: 'transaction',
      title: `${fxText} ${isBuy ? 'alındı' : 'satıldı'}`,
      detail: `${rateText} • Toplam: ${formatCurrency(t.grandTotalTRY, 'TRY')} • ${t.operator}`,
      effects: [
        ...t.items.map((i) => ({
          text: `${isBuy ? '+' : '−'}${formatNumber(i.amount)} ${i.code}`,
          positive: isBuy
        })),
        {
          text: `${isBuy ? '−' : '+'}${formatNumber(t.grandTotalTRY)} ₺`,
          positive: !isBuy
        }
      ]
    };
  });

  const expRows: HistoryRow[] = expenses.map((e) => ({
    key: `exp-${e.id}`,
    id: e.id,
    date: e.date,
    kind: e.direction === 'IN' ? 'EXP_IN' : 'EXP_OUT',
    source: 'expense',
    title: e.category,
    detail: e.notes || (e.direction === 'IN' ? 'Manuel kasa girişi' : 'Masraf / çıkış'),
    effects: [
      {
        text: `${e.direction === 'IN' ? '+' : '−'}${formatNumber(e.amount)} ${CURRENCY_SYMBOLS[e.currency] || e.currency}`,
        positive: e.direction === 'IN'
      }
    ]
  }));

  // Filtreleme: tarih aralığı + tip
  const allRows = [...txRows, ...expRows]
    .filter((r) => {
      const ymd = toLocalYMD(new Date(r.date));
      if (startDate && ymd < startDate) return false;
      if (endDate && ymd > endDate) return false;
      if (typeFilter === 'ALL') return true;
      if (typeFilter === 'EXP') return r.source === 'expense';
      return r.kind === typeFilter;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1200px] mx-auto w-full">
      {/* Başlık */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Günlük İşlem Geçmişi</h1>
            <p className="text-[11px] text-slate-400">
              Alış, satış, arbitraj ve masraf kayıtları • silinen işlemin kasa etkisi geri alınır.
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

      {/* Filtreler + Kasa Özeti */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#0d1527] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-amber-400 [color-scheme:dark]"
            />
            <span className="text-slate-500 text-xs">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#0d1527] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-amber-400 [color-scheme:dark]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                ['ALL', 'Tümü'],
                ['BUY', 'Alış'],
                ['SELL', 'Satış'],
                ['CROSS', 'Arbitraj'],
                ['EXP', 'Masraf/Giriş']
              ] as [TypeFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                  typeFilter === key
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Anlık kasa özeti */}
        <div className="flex items-center gap-2 font-mono flex-wrap">
          {Object.keys(cashbox).map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-black text-slate-200 tabular-nums"
            >
              <span className="text-[9px] text-slate-500">{code}</span>
              {formatNumber(cashbox[code])}
            </span>
          ))}
        </div>
      </div>


      {/* Geçmiş Tablosu */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-x-auto">
        {allRows.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-4 text-center">
            Seçilen tarih aralığında kayıt bulunamadı.
          </p>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-3 py-1 w-[130px]">No / Tarih</th>
                <th className="px-3 py-1 w-[110px]">Tip</th>
                <th className="px-3 py-1">İşlem Detayı</th>
                <th className="px-3 py-1 text-right">Kasa Etkisi</th>
                <th className="px-2 py-1 text-center w-[70px]">İptal</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((r) => (
                <tr key={r.key} className="bg-slate-950/80 rounded-xl">
                  <td className="px-3 py-2.5">
                    <span className="font-mono font-black text-[11px] text-amber-400 block">
                      {r.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(r.date).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${KIND_STYLES[r.kind].cls}`}
                    >
                      {KIND_STYLES[r.kind].label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-100 block">{r.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{r.detail}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {r.effects.map((ef, i) => (
                        <span
                          key={i}
                          className={`font-mono font-black text-xs tabular-nums ${
                            ef.positive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {ef.text}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={() =>
                        r.source === 'transaction'
                          ? handleDeleteTransaction(r.id)
                          : handleDeleteExpense(r.id)
                      }
                      type="button"
                      title="İptal Et / Sil — kasa etkisi otomatik geri alınır"
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-400 hover:bg-rose-900/50 text-[10px] font-black transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>İptal</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

