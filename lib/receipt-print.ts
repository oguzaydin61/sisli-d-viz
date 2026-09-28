'use client';

import { Transaction } from './types';
import { formatNumber, formatRate } from './currency';

const esc = (s: string) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function padRight(str: string, length: number): string {
  return str.padEnd(length, ' ').slice(0, length);
}

function padLeft(str: string, length: number): string {
  return str.padStart(length, ' ').slice(0, length);
}

export function buildReceiptHtml(
  tx: Transaction,
  paperWidth: '80mm' | '58mm' = '80mm'
): string {
  const rateLabel = tx.type === 'SELL' ? 'Satis' : 'Alis';

  const d = new Date(tx.date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const formattedDate = `${day}.${month}.${year}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  // 80mm yazıcılar genelde 32 karakterdir. Tam oturması için 32 karakter kullanalım.
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

  // Sütun genişlikleri toplamı: 5 + 9 + 8 + 10 = 32 Karakter
  const cDoviz = 5;
  const cMiktar = 9;
  const cKur = 8;
  const cTl = 10;

  // Başlık Ortala
  const headerText = 'HESAP PUSULASI';
  const headerPadding = Math.max(0, Math.floor((MAX_COLS - headerText.length) / 2));
  const centeredHeader = ' '.repeat(headerPadding) + headerText;

  // Tarih Saat (Eşit Aralıklı)
  const dateStr = `Tarih:${formattedDate}`;
  const timeStr = `Saat:${formattedTime}`;
  const dateSpace = Math.max(1, MAX_COLS - dateStr.length - timeStr.length);
  const dateLine = dateStr + ' '.repeat(dateSpace) + timeStr;

  const separator = '-'.repeat(MAX_COLS);

  // Tablo Başlıkları
  const tableHeader = 
    padRight('Doviz', cDoviz) +
    padLeft('Miktar', cMiktar) +
    padLeft(rateLabel, cKur) +
    padLeft('TL Kars.', cTl);

  // Tablo Satırları
  const tableRows = rows.map(r => 
    padRight(r.doviz, cDoviz) +
    padLeft(r.miktar, cMiktar) +
    padLeft(r.kur, cKur) +
    padLeft(r.tl, cTl)
  ).join('\n');

  // Toplam Satırı (Garantili Hiza)
  const totalLabel = 'TL Toplam';
  const totalVal = formatNumber(tx.grandTotalTRY);
  const totalSpaces = Math.max(1, MAX_COLS - totalLabel.length - totalVal.length);
  const totalLine = totalLabel + ' '.repeat(totalSpaces) + totalVal;

  // Metni eksiksiz satır satır birleştirme
  const rawText = 
    centeredHeader + '\n\n' +
    dateLine + '\n' +
    separator + '\n' +
    tableHeader + '\n' +
    tableRows + '\n' +
    separator + '\n' +
    totalLine + '\n\n\n';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; size: auto; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    font-weight: bold;
    line-height: 1.2;
    margin: 0;
    padding: 4px;
    white-space: pre;
    width: 100%;
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