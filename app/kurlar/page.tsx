'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CurrencyItem } from '@/lib/types';
import { formatRate, sanitizeRateInput, parseRateInput } from '@/lib/currency';
import { Coins, Pencil, Trash2, Check, X, Plus, RefreshCw, AlertCircle } from 'lucide-react';

interface EditState {
  originalCode: string;
  code: string;
  title: string;
  buy: string;
  sell: string;
}

const EMPTY_NEW = { code: '', title: '', buy: '', sell: '' };

export default function RatesPage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [newCur, setNewCur] = useState(EMPTY_NEW);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const notify = useCallback((kind: 'success' | 'error', text: string) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Veriler yüklenemedi');
      setCurrencies(json.data.currencies || []);
    } catch (e: unknown) {
      notify('error', e instanceof Error ? e.message : 'Veri yükleme hatası');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  // Tüm listeyi db.json'a kalıcı yaz
  const persist = async (list: CurrencyItem[], okMsg: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Kaydedilemedi');
      setCurrencies(json.data);
      notify('success', okMsg);
      return true;
    } catch (e: unknown) {
      notify('error', e instanceof Error ? e.message : 'Kayıt hatası');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!edit) return;
    const code = edit.code.toUpperCase().trim();
    const title = edit.title.trim();
    const buy = parseRateInput(edit.buy);
    const sell = parseRateInput(edit.sell);

    if (!code || code.length < 3) return notify('error', 'Sembol en az 3 harf olmalıdır (örn: USD).');
    if (!title) return notify('error', 'Açıklama / unvan boş bırakılamaz.');
    if (buy <= 0 || sell <= 0) return notify('error', 'Alış ve Satış kurları 0’dan büyük olmalıdır.');
    if (buy > sell) return notify('error', 'Alış kuru satış kurundan büyük olamaz.');
    if (currencies.some((c) => c.code === code && c.code !== edit.originalCode)) {
      return notify('error', `${code} sembolü zaten tanımlı.`);
    }

    const list = currencies.map((c) =>
      c.code === edit.originalCode ? { code, title, buy, sell } : c
    );
    const ok = await persist(list, `${code} kuru güncellendi.`);
    if (ok) setEdit(null);
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`${code} para birimini silmek istediğinize emin misiniz?`)) return;
    await persist(
      currencies.filter((c) => c.code !== code),
      `${code} para birimi silindi.`
    );
  };

  const handleAdd = async () => {
    const code = newCur.code.toUpperCase().trim();
    const title = newCur.title.trim();
    const buy = parseRateInput(newCur.buy);
    const sell = parseRateInput(newCur.sell);

    if (!code || code.length < 3) return notify('error', 'Sembol en az 3 harf olmalıdır (örn: CHF).');
    if (currencies.some((c) => c.code === code)) return notify('error', `${code} zaten tanımlı.`);
    if (!title) return notify('error', 'Açıklama / unvan giriniz.');
    if (buy <= 0 || sell <= 0) return notify('error', 'Alış ve Satış kurları 0’dan büyük olmalıdır.');
    if (buy > sell) return notify('error', 'Alış kuru satış kurundan büyük olamaz.');

    const ok = await persist([...currencies, { code, title, buy, sell }], `${code} eklendi ve gişede aktif edildi.`);
    if (ok) setNewCur(EMPTY_NEW);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 max-w-[1100px] mx-auto w-full">
      {/* Başlık */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Kur Yönetimi</h1>
            <p className="text-[11px] text-slate-400">
              Yeni para birimleri gişe ekranında ve canlı kur tahtasında anında aktif olur.
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
          {message.kind === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Kur Tablosu */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              <th className="px-3 py-1.5 w-[110px]">Sembol</th>
              <th className="px-3 py-1.5">Açıklama / Unvan</th>
              <th className="px-3 py-1.5 w-[140px] text-right">Alış Kuru</th>
              <th className="px-3 py-1.5 w-[140px] text-right">Satış Kuru</th>
              <th className="px-3 py-1.5 w-[110px] text-right">Makas</th>
              <th className="px-2 py-1.5 w-[90px] text-center">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => {
              const isEditing = edit?.originalCode === c.code;
              return (
                <tr key={c.code} className="bg-slate-950/80 rounded-xl">

                  {isEditing && edit ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          value={edit.code}
                          onChange={(e) =>
                            setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })
                          }
                          maxLength={5}
                          className="w-24 bg-[#0d1527] border-2 border-amber-500/60 rounded-lg px-2 py-1.5 text-sm font-black font-mono text-amber-300 uppercase outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={edit.title}
                          onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                          className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs font-semibold text-white outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          value={edit.buy}
                          inputMode="decimal"
                          onChange={(e) => setEdit({ ...edit, buy: sanitizeRateInput(e.target.value) })}
                          className="w-full bg-[#0d1527] border-2 border-emerald-700/60 rounded-lg px-2 py-1.5 text-sm font-black font-mono text-emerald-400 text-right outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          value={edit.sell}
                          inputMode="decimal"
                          onChange={(e) => setEdit({ ...edit, sell: sanitizeRateInput(e.target.value) })}
                          className="w-full bg-[#0d1527] border-2 border-rose-700/60 rounded-lg px-2 py-1.5 text-sm font-black font-mono text-rose-400 text-right outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-[10px] text-slate-500 font-mono">—</td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            type="button"
                            title="Kaydet"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEdit(null)}
                            type="button"
                            title="Vazgeç"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-1 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400 font-mono font-black text-xs">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-slate-200">{c.title}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-emerald-400 tabular-nums">
                        {formatRate(c.buy)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-rose-400 tabular-nums">
                        {formatRate(c.sell)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-400 tabular-nums">
                        {formatRate(c.sell - c.buy)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              setEdit({
                                originalCode: c.code,
                                code: c.code,
                                title: c.title,
                                buy: String(c.buy),
                                sell: String(c.sell)
                              })
                            }
                            type="button"
                            title="Düzenle"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.code)}
                            type="button"
                            title="Sil"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* Yeni Para Birimi Ekle */}
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Yeni Para Birimi Ekle
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Sembol
            </label>
            <input
              value={newCur.code}
              onChange={(e) =>
                setNewCur({ ...newCur, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })
              }
              maxLength={5}
              placeholder="CHF"
              className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm font-black font-mono text-white uppercase outline-none placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Açıklama / Unvan
            </label>
            <input
              value={newCur.title}
              onChange={(e) => setNewCur({ ...newCur, title: e.target.value })}
              placeholder="İsviçre Frangı"
              className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-semibold text-white outline-none placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 block mb-1">
              Alış Kuru
            </label>
            <input
              value={newCur.buy}
              inputMode="decimal"
              onChange={(e) => setNewCur({ ...newCur, buy: sanitizeRateInput(e.target.value) })}
              placeholder="0,0000"
              className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-sm font-black font-mono text-emerald-400 text-right outline-none placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-rose-500 block mb-1">
              Satış Kuru
            </label>
            <input
              value={newCur.sell}
              inputMode="decimal"
              onChange={(e) => setNewCur({ ...newCur, sell: sanitizeRateInput(e.target.value) })}
              placeholder="0,0000"
              className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-rose-400 rounded-lg px-3 py-2 text-sm font-black font-mono text-rose-400 text-right outline-none placeholder:text-slate-600"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={saving}
              type="button"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'KAYDEDİLİYOR...' : 'EKLE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

