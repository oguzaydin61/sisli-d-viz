'use client';

import React, { useState } from 'react';
import { Printer, X, Check, Copy } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { formatCurrency, formatNumber, formatRate, numberToTurkishText } from '@/lib/currency';
import ReceiptPrintView from './ReceiptPrintView';
import { printTransactionReceipt } from '@/lib/receipt-print';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  transaction
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<'70mm' | '58mm'>('70mm');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    // İzole iframe belgesi olarak yazdır: tek sayfa (70x100mm), tek fiş
    printTransactionReceipt(transaction);
  };

  const formattedDate = new Date(transaction.date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const handleCopyText = () => {
    const lines = transaction.cross
      ? `VERİLEN: ${formatNumber(transaction.cross.fromAmount)} ${transaction.cross.fromCode} @ ${formatRate(transaction.cross.fromRate)} TL\nALINAN : ${formatNumber(transaction.cross.toAmount)} ${transaction.cross.toCode} @ ${formatRate(transaction.cross.toRate)} TL\nÇAPRAZ : 1 ${transaction.cross.fromCode} = ${formatRate(transaction.cross.crossRate)} ${transaction.cross.toCode}`
      : transaction.items
          .map(
            (it) =>
              `${it.code} (${it.title}): ${formatNumber(it.amount)} @ ${formatRate(it.rate)} TL = ${formatCurrency(it.totalTRY, 'TRY')}`
          )
          .join('\n');

    const typeLabel =
      transaction.type === 'BUY'
        ? 'DÖVİZ ALIŞ'
        : transaction.type === 'SELL'
        ? 'DÖVİZ SATIŞ'
        : 'DÖVİZ TAKAS';

    const text = `
=================================
       SİSLİ DÖVİZ A.Ş.
   A Grubu Yetkili Müessese
=================================
Fiş No   : ${transaction.id}
Tarih    : ${formattedDate}
İşlem    : ${typeLabel}
Gişe     : ${transaction.operator}
---------------------------------
${lines}
---------------------------------
GENEL TOPLAM : ${formatCurrency(transaction.grandTotalTRY, 'TRY')}
${numberToTurkishText(transaction.grandTotalTRY)}
=================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Termal Fiş Önizleme & Yazdırma</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setPaperWidth('70mm')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  paperWidth === '70mm'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                70mm
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Paper Area */}
        <div className="overflow-y-auto p-6 bg-slate-950/60 flex justify-center items-start">
          <ReceiptPrintView transaction={transaction} paperWidth={paperWidth} />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between no-print">
          <button
            onClick={handleCopyText}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Metni Kopyala</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Kapat (ESC)
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>Fiş Yazdır</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
