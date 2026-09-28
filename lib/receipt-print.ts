'use client';

import { Transaction } from './types';
import { formatNumber, formatRate } from './currency';

const esc = (s: string) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Termal yazıcılar için optimize edilmiş fiş şablonu.
 * Flexbox kullanılmamış, standart HTML table ve inline CSS tercih edilmiştir.
 */
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

  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="text-align: left; padding: 2px 0;">${esc(r.doviz)}</td>
      <td style="text-align: right; padding: 2px 0;">${esc(r.miktar)}</td>
      <td style="text-align: right; padding: 2px 0;">${esc(r.kur)}</td>
      <td style="text-align: right; padding: 2px 0;">${esc(r.tl)}</td>
    </tr>
  `
    )
    .join('');

  // Sayfa genişliği sınırlandırması
  const printWidth = paperWidth === '58mm' ? '48mm' : '72mm';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>HESAP PUSULASI</title>
<style>
  @page {
    size: auto;
    margin: 0mm;
  }
  @media print {
    body {
      width: ${printWidth};
    }
  }
</style>
</head>
<body style="
  margin: 0 auto;
  padding: 5mm 2mm;
  width: ${printWidth};
  background: #fff;
  color: #000;
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  line-height: 1.3;
">

  <!-- BAŞLIK -->
  <div style="text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 8px;">
    HESAP PUSULASI
  </div>

  <!-- TARİH VE SAAT (Flex yerine Standart Tablo) -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
    <tr>
      <td style="text-align: left;">Tarih: ${formattedDate}</td>
      <td style="text-align: right;">Saat: ${formattedTime}</td>
    </tr>
  </table>

  <div style="border-bottom: 1px dashed #000; margin-bottom: 6px;"></div>

  <!-- VERİ TABLOSU -->
  <table style="width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed;">
    <thead>
      <tr style="font-weight: bold;">
        <th style="text-align: left; width: 18%; padding-bottom: 4px;">Doviz</th>
        <th style="text-align: right; width: 26%; padding-bottom: 4px;">Miktari</th>
        <th style="text-align: right; width: 26%; padding-bottom: 4px;">${rateLabel}</th>
        <th style="text-align: right; width: 30%; padding-bottom: 4px;">TL Karsiligi</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="border-bottom: 1px dashed #000; margin-top: 6px; margin-bottom: 6px;"></div>

  <!-- TOPLAM TARİFİ -->
  <table style="width: 100%; border-collapse: collapse; font-size: 11px; font-weight: bold;">
    <tr>
      <td style="text-align: left;">TL Toplam</td>
      <td style="text-align: right;">${formatNumber(tx.grandTotalTRY)}</td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Fişi izole bir iframe belgesine yazıp yalnızca o belgeyi yazdırır.
 */
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

  // Yükleme süresini termal yazıcı sürücülerinin işleyebilmesi için biraz arttırdık
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }
  }, 300);
}