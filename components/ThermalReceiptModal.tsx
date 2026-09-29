'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X, Check, Copy } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { formatNumber, formatRate } from '@/lib/currency';
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
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    printTransactionReceipt(transaction);
  };

  const handleCopyText = () => {
    const rateLabel = transaction.type === 'SELL' ? 'Satis Kuru' : 'Alis Kuru';
    const d = new Date(transaction.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const formattedDate = `${day}.${month}.${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    const rows: { doviz: string; miktar: string; kur: string; tl: string }[] = [];

    if (transaction.type === 'CROSS' && transaction.cross) {
      rows.push({
        doviz: transaction.cross.fromCode,
        miktar: formatNumber(transaction.cross.fromAmount),
        kur: formatRate(transaction.cross.fromRate),
        tl: formatNumber(transaction.grandTotalTRY)
      });
    } else if (transaction.items && transaction.items.length > 0) {
      transaction.items.forEach((it) => {
        rows.push({
          doviz: it.code,
          miktar: formatNumber(it.amount),
          kur: formatRate(it.rate),
          tl: formatNumber(it.totalTRY)
        });
      });
    }

    while (rows.length < 4) {
      rows.push({
        doviz: '---',
        miktar: '---',
        kur: '---',
        tl: '---'
      });
    }

    const tableText = rows
      .map(
        (r) =>
          `${r.doviz.padEnd(8)} ${r.miktar.padStart(10)} ${r.kur.padStart(12)} ${r.tl.padStart(14)}`
      )
      .join('\n');

    const separator = '-------------------------------------------------';
    const totalLine = `${'TL Toplam'.padEnd(30)} ${formatNumber(transaction.grandTotalTRY).padStart(18)}`;

    const text = `HESAP PUSULASI\nTarih: ${formattedDate}   Saat: ${formattedTime}\n\n${'Doviz'.padEnd(8)} ${'Miktari'.padStart(10)} ${rateLabel.padStart(12)} ${'TL Karsiligi'.padStart(14)}\n${tableText}\n${separator}\n${totalLine}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm font-mono">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>HESAP PUSULASI</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm
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