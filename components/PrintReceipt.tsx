'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '@/lib/types';
import ReceiptPrintView from './ReceiptPrintView';

/**
 * Fişi React Portal ile document.body'nin doğrudan çocuğu olarak basar.
 * globals.css @media print kuralları, body.printing-receipt aktifken
 * uygulamanın geri kalanını display:none ile kapatır ve yalnızca
 * .print-root'u basar -> tek sayfa (70x100mm), tek fiş, temiz içerik.
 */
export default function PrintReceipt({ transaction }: { transaction: Transaction }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="print-root">
      <ReceiptPrintView transaction={transaction} />
    </div>,
    document.body
  );
}
