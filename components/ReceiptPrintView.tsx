'use client';

import React from 'react';
import { Transaction } from '@/lib/types';
import { formatNumber, formatRate } from '@/lib/currency';

interface ReceiptPrintViewProps {
  transaction: Transaction;
  paperWidth?: '80mm' | '58mm' | '70mm';
}

export default function ReceiptPrintView({
  transaction,
  paperWidth = '80mm'
}: ReceiptPrintViewProps) {
  const rateLabel = transaction.type === 'SELL' ? 'Satis Kuru' : 'Alis Kuru';
  const widthClass = paperWidth === '58mm' ? 'w-[290px]' : 'w-[370px]';

  const d = new Date(transaction.date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const formattedDate = `${day}.${month}.${year}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  interface RowItem {
    doviz: string;
    miktar: string;
    kur: string;
    tl: string;
  }

  const rows: RowItem[] = [];

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

  const MIN_ROWS = 4;
  while (rows.length < MIN_ROWS) {
    rows.push({
      doviz: '---',
      miktar: '---',
      kur: '---',
      tl: '---'
    });
  }

  return (
    <div
      className={`receipt-print-container bg-white text-black font-mono shadow-2xl p-5 border border-slate-300 ${widthClass}`}
      style={{ fontFamily: 'monospace' }}
    >
      <div className="text-center font-bold text-[26px] mb-3 tracking-wide">
        HESAP PUSULASI
      </div>

      <div className="flex justify-between text-[18px] font-bold mb-4 border-b-0 pb-1">
        <span>Tarih: {formattedDate}</span>
        <span>Saat: {formattedTime}</span>
      </div>

      <table className="w-full text-[18px] font-bold border-collapse border-0">
        <thead>
          <tr className="border-0">
            <th className="text-left py-1.5 w-[20%] font-bold">Doviz</th>
            <th className="text-right py-1.5 w-[25%] font-bold">Miktari</th>
            <th className="text-right py-1.5 w-[25%] font-bold">{rateLabel}</th>
            <th className="text-right py-1.5 w-[30%] font-bold">TL Karsiligi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-0">
              <td className="text-left py-1.5">{r.doviz}</td>
              <td className="text-right py-1.5">{r.miktar}</td>
              <td className="text-right py-1.5">{r.kur}</td>
              <td className="text-right py-1.5">{r.tl}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="text-left pt-3 pb-1 border-t-2 border-dashed border-black font-bold text-[21px]">
              TL Toplam
            </td>
            <td colSpan={2} className="text-right pt-3 pb-1 border-t-2 border-dashed border-black font-bold text-[21px]">
              {formatNumber(transaction.grandTotalTRY)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
