'use client';

import React from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrency, formatNumber, formatRate, numberToTurkishText } from '@/lib/currency';

interface ReceiptPrintViewProps {
  transaction: Transaction;
  paperWidth?: '70mm' | '58mm';
}

/**
 * 70x100mm tek sayfa termal fiş (kompakt düzen).
 * `receipt-print-container` sınıfı globals.css @media print kurallarıyla eşleşir.
 */
export default function ReceiptPrintView({
  transaction,
  paperWidth = '70mm'
}: ReceiptPrintViewProps) {
  const formattedDate = new Date(transaction.date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const typeLabel =
    transaction.type === 'BUY'
      ? 'DÖVİZ ALIŞ (BİZ ALDIK)'
      : transaction.type === 'SELL'
      ? 'DÖVİZ SATIŞ (BİZ SATTIK)'
      : 'DÖVİZ TAKAS (CROSS)';

  return (
    <div
      className={`receipt-print-container bg-white text-black font-mono shadow-2xl p-3 border border-slate-300 ${
        paperWidth === '70mm' ? 'w-[264px]' : 'w-[220px]'
      }`}
      style={{ fontFamily: 'monospace' }}
    >
      {/* Mağaza Başlığı (kompakt) */}
      <div className="text-center pb-1.5 border-b border-dashed border-gray-400">
        <h2 className="text-[13px] font-black leading-tight">BİMAY DÖVİZ A.Ş.</h2>
        <p className="text-[8px] text-gray-600 leading-tight">
          A Grubu Yetkili Müessese • Şişli / İSTANBUL
        </p>
        <p className="text-[8px] text-gray-600 leading-tight">Tel: 0212 555 44 33</p>
      </div>

      {/* Fiş Bilgileri */}
      <div className="py-1.5 text-[9px] space-y-0.5 border-b border-dashed border-gray-400 leading-tight">
        <div className="flex justify-between font-black text-[10px]">
          <span>FİŞ NO:</span>
          <span>{transaction.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">TARİH:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">GİŞE:</span>
          <span>{transaction.operator || 'Gişe 1'}</span>
        </div>
      </div>

      {/* İşlem Türü */}
      <div className="my-1 py-1 px-1 bg-gray-100 text-center border border-gray-300 font-bold text-[9px] uppercase tracking-wide">
        ★ {typeLabel} ★
      </div>


      {/* Kalemler / Çapraz Detay (kompakt) */}
      {transaction.type === 'CROSS' && transaction.cross ? (
        <div className="py-1 text-[9px] space-y-0.5 border-b border-dashed border-gray-400 leading-tight">
          <div className="flex justify-between font-bold">
            <span>VERİLEN:</span>
            <span>
              {formatNumber(transaction.cross.fromAmount)} {transaction.cross.fromCode}
            </span>
          </div>
          <div className="flex justify-between text-gray-600 text-[8px]">
            <span>Kur: {formatRate(transaction.cross.fromRate)} TL</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ALINAN:</span>
            <span>
              {formatNumber(transaction.cross.toAmount)} {transaction.cross.toCode}
            </span>
          </div>
          <div className="flex justify-between text-gray-600 text-[8px]">
            <span>Kur: {formatRate(transaction.cross.toRate)} TL</span>
            <span>
              1 {transaction.cross.fromCode} = {formatRate(transaction.cross.crossRate)}{' '}
              {transaction.cross.toCode}
            </span>
          </div>
          <div className="pt-1 mt-0.5 border-t border-dashed border-gray-400 flex justify-between text-[11px] font-black">
            <span>İŞLEM DEĞERİ:</span>
            <span>{formatCurrency(transaction.grandTotalTRY, 'TRY')}</span>
          </div>
        </div>
      ) : (
        <div className="py-1 text-[9px] space-y-1 border-b border-dashed border-gray-400 leading-tight">
          {transaction.items.map((item, idx) => (
            <div key={idx} className="space-y-0">
              <div className="flex justify-between font-bold text-[10px]">
                <span>
                  {item.code} - {item.title}
                </span>
                <span>{formatNumber(item.amount)}</span>
              </div>
              <div className="flex justify-between text-[8px] text-gray-600">
                <span>
                  Kur: {formatRate(item.rate)}
                  {item.isNegotiated && ' (P)'}
                </span>
                <span className="font-bold text-black text-[9px]">
                  {formatCurrency(item.totalTRY, 'TRY')}
                </span>
              </div>
            </div>
          ))}
          <div className="pt-1 mt-0.5 border-t border-dashed border-gray-400 flex justify-between text-[11px] font-black">
            <span>GENEL TOPLAM:</span>
            <span>{formatCurrency(transaction.grandTotalTRY, 'TRY')}</span>
          </div>
        </div>
      )}

      {/* Yazıyla Tutar */}
      <div className="py-1 text-[7px] leading-tight text-gray-800 italic border-b border-dashed border-gray-400 text-center font-bold">
        {numberToTurkishText(transaction.grandTotalTRY)}
      </div>

      {/* İmzalar (kompakt) */}
      <div className="pt-1.5 pb-1 grid grid-cols-2 gap-3 text-[8px] text-center border-b border-dashed border-gray-400">
        <div>
          <p className="font-bold text-gray-700">GİŞE YETKİLİSİ</p>
          <div className="h-5 border-b border-dotted border-gray-400 mt-0.5"></div>
        </div>
        <div>
          <p className="font-bold text-gray-700">MÜŞTERİ</p>
          <div className="h-5 border-b border-dotted border-gray-400 mt-0.5"></div>
        </div>
      </div>

      {/* Alt Bilgi (tek satır) */}
      <div className="pt-1 text-center">
        <p className="text-[7px] text-gray-600 leading-tight">
          Parayı gişeden ayrılmadan sayarak teslim alınız. Bilgi fişidir.
        </p>
        <p className="text-[8px] font-bold text-gray-800 tracking-wide">
          BİMAY DÖVİZ OTOMASYONU
        </p>
      </div>
    </div>
  );
}
