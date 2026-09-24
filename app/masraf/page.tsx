'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CashboxBalances, CurrencyItem, ExpenseEntry, ExpenseDirection } from '@/lib/types';
import {
  CURRENCY_SYMBOLS,
  formatLiveNumericInput,
  formatNumber,
  parseFormattedNumber
} from '@/lib/currency';
import {
  Wallet,
  RefreshCw,
  AlertCircle,
  Check,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2
} from 'lucide-react';

const QUICK_CATEGORIES = [
  'Yemek Masrafı',
  'Kira',
  'Banka Nakit Çekim',
  'Bankaya Yatırma',
  'Personel Avans',
  'Fatura Ödeme',
  'Diğer'
];

export default function ExpensePage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [cashbox, setCashbox] = useState<CashboxBalances>({ TRY: 0, USD: 0, EUR: 0 });
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [direction, setDirection] = useState<ExpenseDirection>('OUT');
  const [currency, setCurrency] = useState('TRY');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

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
      setCurrencies(json.data.currencies || []);
      setCashbox(json.data.cashbox || { TRY: 0, USD: 0, EUR: 0 });
      setExpenses(json.data.expenses || []);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const amountNum = parseFormattedNumber(amount);
  const available = cashbox[currency] || 0;
  const insufficient = direction === 'OUT' && amountNum > 0 && amountNum > available;

  const handleSubmit = async () => {
    if (amountNum <= 0) return notify('error', 'Geçerli bir tutar giriniz.');
    if (!category.trim()) return notify('error', 'Açıklama / kategori giriniz.');
    if (insufficient) {
      return notify('error', `Yetersiz Kasa Bakiyesi: Kasada ${formatNumber(available)} ${currency} bulunmaktadır`);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          currency,
          amount: amountNum,
          category: category.trim(),
          notes: notes.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Kaydedilemedi');
      setCashbox(json.data.cashbox);
      setExpenses((prev) => [json.data.expense, ...prev]);
      notify('success', json.message || 'Kasa hareketi kaydedildi.');
      setAmount('');
      setCategory('');
      setNotes('');
    } catch (e: unknown) {
      notify('error', e instanceof Error ? e.message : 'Kayıt hatası');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`${id} hareketini iptal etmek istediğinize emin misiniz? Kasa etkisi geri alınır.`)) {
      return;
    }
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

  const isIn = direction === 'IN';

  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1100px] mx-auto w-full">
      {/* Başlık */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Kasa Giriş / Çıkış & Masraf</h1>
            <p className="text-[11px] text-slate-400">
              Manuel nakit girişi veya masraf/çıkış kaydı • bakiyeler anında güncellenir.
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

      {/* Form */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4">
        {/* İşlem Tipi */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/60 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setDirection('IN')}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-black text-sm tracking-wider transition-all ${
              isIn
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <ArrowDownCircle className="w-5 h-5" />
            <span>GİRİŞ (+)</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('OUT')}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-black text-sm tracking-wider transition-all ${
              !isIn
                ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <ArrowUpCircle className="w-5 h-5" />
            <span>ÇIKIŞ / MASRAF (−)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Para Birimi */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Para Birimi
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[#0d1527] border-2 border-slate-700 rounded-lg px-3 py-2.5 text-sm font-black font-mono text-white outline-none"
            >
              <option value="TRY">TRY — Türk Lirası</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-slate-500 block mt-1">
              Kasada mevcut:{' '}
              <strong className={insufficient ? 'text-rose-400' : 'text-slate-300'}>
                {formatNumber(available)} {CURRENCY_SYMBOLS[currency] || currency}
              </strong>
            </span>
          </div>

          {/* Tutar */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Tutar
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(formatLiveNumericInput(e.target.value, 2))}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              className={`w-full bg-[#0d1527] border-2 rounded-lg px-3 py-2.5 text-lg font-black font-mono text-right outline-none tabular-nums placeholder:text-slate-600 ${
                isIn
                  ? 'border-emerald-700/60 focus:border-emerald-400 text-emerald-300'
                  : 'border-rose-700/60 focus:border-rose-400 text-rose-300'
              }`}
            />
          </div>
        </div>


        {/* Açıklama / Kategori */}
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
            Açıklama / Kategori
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Örn: Yemek Masrafı, Banka Nakit Çekim, Kira..."
            className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  category === cat
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Not (opsiyonel) */}
        <div>
          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
            Ek Not (opsiyonel)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="İsteğe bağlı detay..."
            className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-slate-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        {/* Kaydet */}
        <button
          onClick={handleSubmit}
          disabled={submitting || insufficient}
          type="button"
          className={`w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
            isIn
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
              : 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/50'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span>
            {submitting
              ? 'KAYDEDİLİYOR...'
              : isIn
              ? `KASAYA GİRİŞ KAYDET (+${formatNumber(amountNum)} ${currency})`
              : `MASRAF / ÇIKIŞ KAYDET (−${formatNumber(amountNum)} ${currency})`}
          </span>
        </button>
      </div>


      {/* Hareket Tablosu */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-x-auto">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
          <Wallet className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Kasa Hareketleri
          </span>
          <span className="text-[10px] text-slate-500 font-mono">({expenses.length} kayıt)</span>
        </div>
        {expenses.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-3 text-center">
            Henüz kasa hareketi kaydedilmedi.
          </p>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-3 py-1">No / Tarih</th>
                <th className="px-3 py-1">Tip</th>
                <th className="px-3 py-1">Açıklama</th>
                <th className="px-3 py-1 text-right">Tutar</th>
                <th className="px-2 py-1 text-center w-[60px]">İptal</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="bg-slate-950/80 rounded-xl">
                  <td className="px-3 py-2">
                    <span className="font-mono font-black text-[11px] text-sky-400 block">{e.id}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(e.date).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        e.direction === 'IN'
                          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                          : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                      }`}
                    >
                      {e.direction === 'IN' ? 'GİRİŞ' : 'MASRAF'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-200">
                    {e.category}
                    {e.notes && <span className="text-slate-500 text-[10px] block">{e.notes}</span>}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-black text-sm tabular-nums ${
                      e.direction === 'IN' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {e.direction === 'IN' ? '+' : '−'}
                    {formatNumber(e.amount)} {CURRENCY_SYMBOLS[e.currency] || e.currency}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => handleDelete(e.id)}
                      type="button"
                      title="İptal Et / Sil (kasa etkisi geri alınır)"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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

