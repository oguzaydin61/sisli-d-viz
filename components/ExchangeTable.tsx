'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { CurrencyItem, TransactionItem, TransactionType } from '@/lib/types';
import {
  formatCurrency,
  formatLiveNumericInput,
  formatNumber,
  formatRate,
  numberToTurkishText,
  parseFormattedNumber,
  parseRateInput,
  sanitizeRateInput
} from '@/lib/currency';
import { Plus, Trash2, Printer, Save, AlertCircle } from 'lucide-react';

interface RowState {
  id: string;
  code: string;
  title: string;
  amount: string;
  rate: string;
  standardRate: number;
  isNegotiated: boolean;
  totalTRY: string;
}

interface ExchangeTableProps {
  currencies: CurrencyItem[];
  mode: TransactionType;
  receiptNumber: string;
  onSubmitTransaction: (
    items: TransactionItem[],
    grandTotal: number,
    printReceipt: boolean
  ) => Promise<void>;
  loading?: boolean;
}

export interface ExchangeTableRef {
  focusFirstInput: () => void;
  resetForm: () => void;
  triggerSubmit: (printReceipt: boolean) => void;
  applyCurrencyCode: (code: string) => void;
  getGrandTotal: () => number;
}

const ExchangeTable = forwardRef<ExchangeTableRef, ExchangeTableProps>(
  ({ currencies, mode, receiptNumber, onSubmitTransaction, loading = false }, ref) => {
    // Generate initial clean row
    const createEmptyRow = (customId?: string): RowState => ({
      id: customId || `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: '',
      title: '',
      amount: '',
      rate: '',
      standardRate: 0,
      isNegotiated: false,
      totalTRY: ''
    });

    const [rows, setRows] = useState<RowState[]>([createEmptyRow('row-initial')]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Dynamic ref mapping for keyboard focus management
    const inputRefs = useRef<Record<string, Record<string, HTMLInputElement | null>>>({});

    const registerInput = (
      rowId: string,
      field: 'code' | 'amount' | 'rate' | 'totalTRY',
      el: HTMLInputElement | null
    ) => {
      if (!inputRefs.current[rowId]) {
        inputRefs.current[rowId] = {};
      }
      inputRefs.current[rowId][field] = el;
    };

    // Auto-focus first input on load
    useEffect(() => {
      focusFirstInput();
    }, []);

    // When mode (BUY/SELL) changes, update default rates for rows where rate wasn't manually negotiated
    useEffect(() => {
      setRows((prev) =>
        prev.map((row) => {
          if (!row.code) return row;
          const matched = currencies.find((c) => c.code.toUpperCase() === row.code.toUpperCase());
          if (!matched) return row;

          const defaultRate = mode === 'BUY' ? matched.buy : matched.sell;
          if (!row.isNegotiated) {
            const numAmount = parseFormattedNumber(row.amount);
            const newTotal = numAmount > 0 ? formatNumber(numAmount * defaultRate, 2) : row.totalTRY;
            return {
              ...row,
              rate: String(defaultRate),
              standardRate: defaultRate,
              totalTRY: newTotal
            };
          }
          return row;
        })
      );
    }, [mode, currencies]);

    const focusFirstInput = () => {
      const firstRow = rows[0];
      if (firstRow && inputRefs.current[firstRow.id]?.code) {
        inputRefs.current[firstRow.id]?.code?.focus();
        inputRefs.current[firstRow.id]?.code?.select();
      }
    };

    const resetForm = () => {
      const freshRow = createEmptyRow();
      setRows([freshRow]);
      setErrorMessage(null);
      setTimeout(() => {
        if (inputRefs.current[freshRow.id]?.code) {
          inputRefs.current[freshRow.id]?.code?.focus();
        }
      }, 50);
    };

    const applyCurrencyCode = (code: string) => {
      // Apply to last empty row or add new
      let targetRowIndex = rows.findIndex((r) => !r.code);
      let newRows = [...rows];
      if (targetRowIndex === -1) {
        const newRow = createEmptyRow();
        newRows.push(newRow);
        targetRowIndex = newRows.length - 1;
      }

      const matched = currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
      if (matched) {
        const defaultRate = mode === 'BUY' ? matched.buy : matched.sell;
        newRows[targetRowIndex] = {
          ...newRows[targetRowIndex],
          code: matched.code,
          title: matched.title,
          rate: String(defaultRate),
          standardRate: defaultRate,
          isNegotiated: false
        };
        setRows(newRows);

        setTimeout(() => {
          inputRefs.current[newRows[targetRowIndex].id]?.amount?.focus();
        }, 50);
      }
    };

    // Expose ref functions to parent
    useImperativeHandle(ref, () => ({
      focusFirstInput,
      resetForm,
      triggerSubmit: (printReceipt: boolean) => {
        handleFinalSubmit(printReceipt);
      },
      applyCurrencyCode,
      getGrandTotal: () => grandTotalTRY
    }));

    // 1. Kolon: Sembol / Kod değişimi
    const handleCodeChange = (rowId: string, value: string) => {
      setErrorMessage(null);
      const upper = value.toUpperCase().trim();
      const matched = currencies.find((c) => c.code === upper);

      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          if (matched) {
            const defaultRate = mode === 'BUY' ? matched.buy : matched.sell;
            const numAmount = parseFormattedNumber(row.amount);
            const total = numAmount > 0 ? formatNumber(numAmount * defaultRate, 2) : '';

            return {
              ...row,
              code: matched.code,
              title: matched.title,
              rate: String(defaultRate),
              standardRate: defaultRate,
              isNegotiated: false,
              totalTRY: total
            };
          } else {
            return {
              ...row,
              code: upper,
              title: '',
              rate: '',
              standardRate: 0,
              isNegotiated: false,
              totalTRY: ''
            };
          }
        })
      );

      // AUTO-TAB: Geçerli sembol girildiği AN Tab/Enter gerekmeden 3. Kolon (Miktar) odaklanır
      if (matched) {
        setTimeout(() => {
          inputRefs.current[rowId]?.amount?.focus();
          inputRefs.current[rowId]?.amount?.select();
        }, 40);
      }
    };

    // 3. Kolon: Miktar değişimi (binlik ayracı canlı formatlanır)
    const handleAmountChange = (rowId: string, rawValue: string) => {
      setErrorMessage(null);
      const value = formatLiveNumericInput(rawValue, 2);
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          const numAmount = parseFormattedNumber(value);
          const numRate = parseRateInput(row.rate);

          let newTotal = '';
          if (numAmount > 0 && numRate > 0) {
            newTotal = formatNumber(numAmount * numRate, 2);
          }

          return {
            ...row,
            amount: value,
            totalTRY: newTotal
          };
        })
      );
    };

    // 4. Kolon: İşlem Kuru değişimi ('.' veya ',' ondalık ayracı kabul edilir)
    const handleRateChange = (rowId: string, rawValue: string) => {
      setErrorMessage(null);
      const value = sanitizeRateInput(rawValue);
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          const numRate = parseRateInput(value);
          const numAmount = parseFormattedNumber(row.amount);
          const isNeg = value !== '' && numRate > 0 && numRate !== row.standardRate;

          let newTotal = row.totalTRY;
          if (numAmount > 0 && numRate > 0) {
            newTotal = formatNumber(numAmount * numRate, 2);
          }

          return {
            ...row,
            rate: value,
            isNegotiated: isNeg,
            totalTRY: newTotal
          };
        })
      );
    };

    // 5. Kolon: TL Karşılığı değişimi (İki Yönlü Dinamik Hesaplama / Pazarlık Modu)
    const handleTotalTRYChange = (rowId: string, rawValue: string) => {
      setErrorMessage(null);
      const value = formatLiveNumericInput(rawValue, 2);
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;

          const numTotal = parseFormattedNumber(value);
          const numAmount = parseFormattedNumber(row.amount);

          let calculatedRate = row.rate;
          let isNeg = row.isNegotiated;

          if (numTotal > 0 && numAmount > 0) {
            // Rate = Total / Amount
            const r = numTotal / numAmount;
            calculatedRate = r.toFixed(4);
            isNeg = true;
          }

          return {
            ...row,
            totalTRY: value,
            rate: calculatedRate,
            isNegotiated: isNeg
          };
        })
      );
    };

    // Add Row
    const handleAddRow = () => {
      const newRow = createEmptyRow();
      setRows((prev) => [...prev, newRow]);
      setTimeout(() => {
        inputRefs.current[newRow.id]?.code?.focus();
      }, 50);
    };

    // Remove Row
    const handleRemoveRow = (rowId: string) => {
      if (rows.length === 1) {
        resetForm();
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== rowId));
    };

    // Grand Total calculation
    const grandTotalTRY = rows.reduce((sum, r) => sum + parseFormattedNumber(r.totalTRY), 0);

    // Final submit (printReceipt=true -> F4: kaydet + otomatik fiş yazdır)
    const handleFinalSubmit = async (printReceipt: boolean) => {
      setErrorMessage(null);

      // Validate rows
      const validItems: TransactionItem[] = [];
      for (const r of rows) {
        const amount = parseFormattedNumber(r.amount);
        const rate = parseRateInput(r.rate);
        const total = parseFormattedNumber(r.totalTRY);

        if (!r.code || !r.title) {
          setErrorMessage('Lütfen geçerli bir döviz kodu (USD, EUR, GBP, CAD) giriniz.');
          inputRefs.current[r.id]?.code?.focus();
          return;
        }

        if (amount <= 0) {
          setErrorMessage(`${r.code} için geçerli bir miktar giriniz.`);
          inputRefs.current[r.id]?.amount?.focus();
          return;
        }

        if (rate <= 0) {
          setErrorMessage(`${r.code} için geçerli bir kur belirleyiniz.`);
          inputRefs.current[r.id]?.rate?.focus();
          return;
        }

        validItems.push({
          code: r.code,
          title: r.title,
          amount,
          rate,
          standardRate: r.standardRate,
          isNegotiated: r.isNegotiated,
          totalTRY: total > 0 ? total : Number((amount * rate).toFixed(2))
        });
      }

      if (validItems.length === 0) {
        setErrorMessage('En az bir işlem satırı doldurunuz.');
        return;
      }

      try {
        await onSubmitTransaction(validItems, grandTotalTRY, printReceipt);
        resetForm();
      } catch {
        // Kayıt başarısızsa satırlar korunur (hata üst bileşende toast ile gösterilir)
      }
    };

    const isBuy = mode === 'BUY';

    return (
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col gap-5">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 5-Column Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-3 py-1.5 w-[140px]">1. Sembol / Kod</th>
                <th className="px-3 py-1.5 min-w-[180px]">2. Açıklama / Unvan</th>
                <th className="px-3 py-1.5 w-[160px] text-right">3. Miktar</th>
                <th className="px-3 py-1.5 w-[160px] text-right">
                  4. İşlem Kuru ({isBuy ? 'Alış' : 'Satış'})
                </th>
                <th className="px-3 py-1.5 w-[190px] text-right">5. TL Karşılığı</th>
                <th className="px-2 py-1.5 w-[50px] text-center">Sil</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl hover:bg-slate-950 transition-colors shadow-sm"
                >
                  {/* 1. Sembol / Kod */}
                  <td className="px-3 py-2.5">
                    <div className="relative">
                      <input
                        ref={(el) => registerInput(row.id, 'code', el)}
                        type="text"
                        value={row.code}
                        onChange={(e) => handleCodeChange(row.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            if (row.title) {
                              e.preventDefault();
                              inputRefs.current[row.id]?.amount?.focus();
                              inputRefs.current[row.id]?.amount?.select();
                            }
                          }
                        }}
                        placeholder="USD"
                        maxLength={4}
                        className={`w-full bg-[#0d1527] border-2 rounded-lg px-3 py-2 text-sm font-black font-mono tracking-wider uppercase outline-none transition-all placeholder:text-slate-600 ${
                          row.code
                            ? isBuy
                              ? 'border-emerald-500/70 text-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-rose-500/70 text-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-700 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                        }`}
                      />
                    </div>
                  </td>

                  {/* 2. Açıklama / Unvan (Readonly / Auto-filled) */}
                  <td className="px-3 py-2.5">
                    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 truncate select-none h-[40px] flex items-center">
                      {row.title ? (
                        <span className="truncate">{row.title}</span>
                      ) : (
                        <span className="text-slate-600 italic">Sembol yazıldığında otomatik dolar</span>
                      )}
                    </div>
                  </td>

                  {/* 3. Miktar */}
                  <td className="px-3 py-2.5 text-right">
                    <input
                      ref={(el) => registerInput(row.id, 'amount', el)}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={row.amount}
                      onChange={(e) => handleAmountChange(row.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          inputRefs.current[row.id]?.rate?.focus();
                          inputRefs.current[row.id]?.rate?.select();
                        }
                      }}
                      placeholder="0,00"
                      className="w-full bg-[#0d1527] border-2 border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-3 py-2 text-sm font-black font-mono text-white text-right tabular-nums outline-none transition-all placeholder:text-slate-600"
                    />
                  </td>

                  {/* 4. İşlem Kuru (Editable, defaults from db.json) */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="relative">
                      <input
                        ref={(el) => registerInput(row.id, 'rate', el)}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={row.rate}
                        onChange={(e) => handleRateChange(row.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            inputRefs.current[row.id]?.totalTRY?.focus();
                            inputRefs.current[row.id]?.totalTRY?.select();
                          }
                        }}
                        placeholder="0,0000"
                        className={`w-full bg-[#0d1527] border-2 rounded-lg px-3 py-2 text-sm font-black font-mono text-right tabular-nums outline-none transition-all placeholder:text-slate-600 ${
                          row.isNegotiated
                            ? 'border-amber-500 text-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                            : 'border-slate-700 text-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20'
                        }`}
                      />
                      {row.isNegotiated && (
                        <span
                          title="Pazarlık Kuru Uygulandı"
                          className="absolute -top-2 right-1 text-[8px] px-1 py-0.2 rounded bg-amber-500 text-black font-black uppercase"
                        >
                          Pazarlık
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 5. TL Karşılığı (Two-way dynamic sync) */}
                  <td className="px-3 py-2.5 text-right">
                    <input
                      ref={(el) => registerInput(row.id, 'totalTRY', el)}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={row.totalTRY}
                      onChange={(e) => handleTotalTRYChange(row.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // If last row, add new row or trigger finish
                          if (idx === rows.length - 1) {
                            if (row.code && row.amount) {
                              handleAddRow();
                            }
                          } else {
                            const nextRow = rows[idx + 1];
                            inputRefs.current[nextRow.id]?.code?.focus();
                          }
                        }
                      }}
                      placeholder="0,00"
                      className={`w-full bg-[#0d1527] border-2 rounded-lg px-3 py-2 text-base font-black font-mono text-right tabular-nums outline-none transition-all placeholder:text-slate-600 ${
                        row.isNegotiated
                          ? 'border-amber-500 text-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                          : isBuy
                          ? 'border-emerald-600/70 text-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                          : 'border-rose-600/70 text-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                      }`}
                    />
                  </td>

                  {/* Delete button */}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      title="Satırı Kaldır"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Row: Add Row + Fast Quick Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Satır Ekle (Enter)</span>
            </button>

            {/* Quick Currency selector hints */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-slate-400 mr-1">Hızlı Sembol:</span>
              {currencies.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => applyCurrencyCode(c.code)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-slate-300 font-mono text-[11px] font-bold transition-colors"
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono">
              Toplam Kalem: <strong className="text-white">{rows.length}</strong>
            </span>
          </div>
        </div>

        {/* Grand Total & Turkish Text Highlight Bar */}
        <div
          className={`p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
            isBuy
              ? 'bg-emerald-950/30 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
              : 'bg-rose-950/30 border-rose-800/60 shadow-lg shadow-rose-950/20'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                GENEL TOPLAM TUTAR
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Fiş: {receiptNumber}
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-300 italic tracking-wide">
              {grandTotalTRY > 0 ? numberToTurkishText(grandTotalTRY) : 'SIFIR TÜRK LİRASI'}
            </div>
          </div>

          <div className="text-right flex flex-col items-start sm:items-end">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums ${
                isBuy ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(grandTotalTRY, 'TRY', 2)}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              {isBuy ? 'Kasadan Çıkacak / Müşteriye Ödenecek' : 'Kasaya Girecek / Müşteriden Alınacak'}
            </span>
          </div>
        </div>

        {/* Action Buttons: [F1] Fişsiz Kaydet + [F4] Kaydet & Otomatik Fiş Yazdır */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleFinalSubmit(false)}
            title="İşlemi yazıcıya göndermeden kaydeder ve formu sıfırlar"
            className="w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] bg-slate-800 hover:bg-slate-700 text-slate-100 border-2 border-slate-600 hover:border-amber-500/60 disabled:opacity-50"
          >
            <Save className="w-5 h-5 text-amber-400" />
            <span>{loading ? 'KAYDEDİLİYOR...' : 'FİŞSİZ KAYDET [F1]'}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleFinalSubmit(true)}
            title="İşlemi kaydeder ve 80mm termal fişi otomatik yazdırır"
            className={`w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
              isBuy
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/80 ring-2 ring-emerald-400/50'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/80 ring-2 ring-rose-400/50'
            }`}
          >
            <Printer className="w-5 h-5" />
            <span>{loading ? 'İŞLEM KAYDEDİLİYOR...' : 'KAYDET & FİŞ YAZDIR [F4]'}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-black/30 font-mono font-bold">
              {receiptNumber}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

ExchangeTable.displayName = 'ExchangeTable';

export default ExchangeTable;
