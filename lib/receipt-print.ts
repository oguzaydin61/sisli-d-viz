'use client';

import { Transaction } from './types';
import { formatNumber, formatRate } from './currency';

const esc = (s: string) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Belirtilen uzunluğa göre metnin sağına boşluk ekler (sola hizalar)
 */
function padRight(str: string, length: number): string {
  return str.padEnd(length, ' ').slice(0, length);
}

/**
 * Belirtilen uzunluğa göre metnin soluna boşluk ekler (sağa hizalar)
 */
function padLeft(str: string, length: number): string {
  return str.padStart(length, ' ').slice(0, length);
}

export function buildReceiptHtml(
  tx: Transaction,
  paperWidth: '80mm' | '58mm' = '80mm'
): string {
  const rateLabel = tx.type === 'SELL' ? 'Satis Kuru' : 'Alis Kuru';

  const d = new Date(tx.date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const formattedDate = `${day}.${month}.${year}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  // 80mm fişler standart 32 karakter genişliğindedir (58mm için 24 karakter)
  const MAX_COLS = paperWidth === '58mm' ? 24 : 32;

  interface RowItem {
    doviz: string;
    miktar: string;
    kur: string;
    tl: string;
  }

  const rows: RowItem[] = [];

  if (tx.type === 'CROSS' && tx.cross) {
    rows.push({
      doviz: tx.cross.fromCode,
      miktar: formatNumber(tx.cross.fromAmount),
      kur: formatRate(tx.cross.fromRate),
      tl: formatNumber(tx.grandTotalTRY)
    });
  } else if (tx.items && tx.items.length > 0) {
    tx.items.forEach((it) => {
      rows.push({
        doviz: it.code,
        miktar: formatNumber(it.amount),
        kur: formatRate(it.rate),
        tl: formatNumber(it.totalTRY)
      });
    });
  }

  // Minimum 4 satır garantisi
  const MIN_ROWS = 4;
  while (rows.length < MIN_ROWS) {
    rows.push({
      doviz: '---',
      miktar: '---',
      kur: '---',
      tl: '---'
    });
  }

  // Sütun genişlikleri (Toplam: 32 Karakter)
  // Doviz: 5 | Miktar: 8 | Kur: 8 | TL: 11
  const cDoviz = 5;
  const cMiktar = 8;
  const cKur = 8;
  const cTl = 11;

  // 1. Header (Başlık ve Tarih)
  const headerText = 'HESAP PUSULASI';
  const headerPadding = Math.max(0, Math.floor((MAX_COLS - headerText.length) / 2));
  const centeredHeader = ' '.repeat(headerPadding) + headerText;

  const dateLine = `Tarih: ${formattedDate} Saat: ${formattedTime}`;
  const separator = '-'.repeat(MAX_COLS);

  // 2. Tablo Başlıkları
  const tableHeader = 
    padRight('Doviz', cDoviz) +
    padLeft('Miktar', cMiktar) +
    padLeft(rateLabel === 'Satis Kuru' ? 'Satis' : 'Alis', cKur) +
    padLeft('TL Karsiligi', cTl);

  // 3. Tablo Satırları
  const tableRows = rows.map(r => 
    padRight(r.doviz, cDoviz) +
    padLeft(r.miktar, cMiktar) +
    padLeft(r.kur, cKur) +
    padLeft(r.tl, cTl)
  ).join('\n');

  // 4. Toplam Satırı
  const totalLabel = 'TL Toplam';
  const totalVal = formatNumber(tx.grandTotalTRY);
  const totalSpaces = Math.max(1, MAX_COLS - totalLabel.length - totalVal.length);
  const totalLine = totalLabel + ' '.repeat(totalSpaces) + totalVal;

  // Ham metin bloğunu birleştirme
  const rawText = [
    centeredHeader,
    dateLine,
    separator,
    tableHeader,
    tableRows,
    separator,
    totalLine
  ].join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; }
  body {
    margin: 0;
    padding: 5px;
    background: #fff;
    color: #000;
  }
  pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 12px;
    font-weight: bold;
    line-height: 1.2;
    margin: 0;
    white-space: pre;
  }
</style>
</head>
<body>
<pre>${esc(rawText)}</pre>
</body>
</html>`;
}

export function printTransactionReceipt(
  tx: Transaction,
  paperWidth: '80mm' | '58mm' = '80mm'
): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    if (iframe.parentNode) document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(buildReceiptHtml(tx, paperWidth));
  doc.close();

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }
  }, 200);
}