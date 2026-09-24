'use client';

import React, { useState } from 'react';
import { CurrencyItem, TransactionType } from '@/lib/types';
import { formatNumber, formatRate } from '@/lib/currency';
import { SlidersHorizontal, Check, RefreshCw, Save, X } from 'lucide-react';

interface LiveRatesBoardProps {
  currencies: CurrencyItem[];
  activeMode: TransactionType;
  onSelectCurrency?: (code: string) => void;
  onRatesUpdated?: (updated: CurrencyItem[]) => void;
}

export default function LiveRatesBoard({
  currencies,
  activeMode,
  onSelectCurrency,
  onRatesUpdated
}: LiveRatesBoardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, { buy: string; sell: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleStartEdit = () => {
    const map: Record<string, { buy: string; sell: string }> = {};
    currencies.forEach((c) => {
      map[c.code] = {
        buy: String(c.buy),
        sell: String(c.sell)
      };
    });
    setEditValues(map);
    setIsEditing(true);
  };

  const handleSaveRates = async () => {
    setSaving(true);
    try {
      const payload = currencies.map((c) => {
        const item = editValues[c.code] || { buy: c.buy, sell: c.sell };
        return {
          code: c.code,
          title: c.title,
          buy: parseFloat(item.buy) || c.buy,
          sell: parseFloat(item.sell) || c.sell
        };
      });

      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onRatesUpdated?.(data.data);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0b111e] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-2xl flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Canlı Kur Tahtası
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            • Gişe Alış / Satış Referans Kurları
          </span>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
              <Check className="w-3.5 h-3.5" /> Kurlar Kaydedildi
            </span>
          )}

          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Kurları Düzenle</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(false)}
                type="button"
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-white text-[11px] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveRates}
                disabled={saving}
                type="button"
                className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all shadow-md"
              >
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Kaydet</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of currencies */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {currencies.map((curr) => {
          const spread = Number((curr.sell - curr.buy).toFixed(4));
          const isBuyActive = activeMode === 'BUY';

          return (
            <div
              key={curr.code}
              onClick={() => !isEditing && onSelectCurrency?.(curr.code)}
              className={`p-3 rounded-lg border bg-slate-950/60 transition-all ${
                !isEditing ? 'cursor-pointer hover:border-slate-600 hover:bg-slate-900/80' : ''
              } ${
                isBuyActive
                  ? 'border-slate-800/90'
                  : 'border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-black text-xs border border-slate-700">
                    {curr.code}
                  </span>
                  <span className="text-[11px] font-medium text-slate-300 truncate max-w-[90px]">
                    {curr.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono" title="Makas">
                  M: {formatRate(spread)}
                </span>
              </div>

              {/* Rate values or edit inputs */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Buy Rate */}
                <div
                  className={`p-1.5 rounded text-right transition-colors ${
                    isBuyActive && !isEditing
                      ? 'bg-emerald-950/40 border border-emerald-800/60 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/40 border border-slate-800/60'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider">
                    ALIŞ
                  </span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.0001"
                      value={editValues[curr.code]?.buy ?? curr.buy}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          [curr.code]: {
                            ...editValues[curr.code],
                            buy: e.target.value
                          }
                        })
                      }
                      className="w-full bg-slate-950 border border-emerald-700/60 rounded px-1 text-right text-xs font-mono font-bold text-emerald-400 outline-none"
                    />
                  ) : (
                    <span className="text-sm font-black font-mono text-emerald-400 tabular-nums block">
                      {formatRate(curr.buy)}
                    </span>
                  )}
                </div>

                {/* Sell Rate */}
                <div
                  className={`p-1.5 rounded text-right transition-colors ${
                    !isBuyActive && !isEditing
                      ? 'bg-rose-950/40 border border-rose-800/60 ring-1 ring-rose-500/30'
                      : 'bg-slate-900/40 border border-slate-800/60'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-rose-400 block tracking-wider">
                    SATIŞ
                  </span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.0001"
                      value={editValues[curr.code]?.sell ?? curr.sell}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          [curr.code]: {
                            ...editValues[curr.code],
                            sell: e.target.value
                          }
                        })
                      }
                      className="w-full bg-slate-950 border border-rose-700/60 rounded px-1 text-right text-xs font-mono font-bold text-rose-400 outline-none"
                    />
                  ) : (
                    <span className="text-sm font-black font-mono text-rose-400 tabular-nums block">
                      {formatRate(curr.sell)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
