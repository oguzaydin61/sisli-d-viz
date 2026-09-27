'use client';

import { Transaction } from './types';
import { formatNumber, formatRate } from './currency';

const esc = (s: string) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Fiş içeriği:
 * En üstte: HESAP PUSULASI
 * Üstte: Tarih ve Saat
 * Alt kısım: Kenarlıksız ama hizalı tablo (Doviz, Miktari, Alis Kuru / Satis Kuru, TL Karsiligi)
 * Minimum 4 satır veri boşluğu (boş olanlar ---)
 * En altta: Çizgi ve TL Toplam
 * Yazı boyutu: %20 büyütüldü.
 * Türkçe karakter ve sembol yok.
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

  // Satırları oluştur (Minimum 4 satır garantisi)
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

  // Minimum 4 satır olsun, boş kalanlara --- koy
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
      <td class="col-doviz">${esc(r.doviz)}</td>
      <td class="col-miktar">${esc(r.miktar)}</td>
      <td class="col-kur">${esc(r.kur)}</td>
      <td class="col-tl">${esc(r.tl)}</td>
    </tr>
  `
    )
    .join('');

  const maxWidth = paperWidth === '58mm' ? '54mm' : '72mm';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>HESAP PUSULASI</title>
<style>
  @page {
    size: auto;
    margin: 0;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    background: #fff;
    width: 100%;
    color: #000;
  }
  body {
    padding: 6mm 3mm;
    font-family: "Courier New", Courier, monospace;
    font-size: 13px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    max-width: ${maxWidth};
    margin: 0 auto;
  }
  .title {
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 10px;
    padding-bottom: 4px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    border: none;
  }
  .table th, .table td {
    border: none;
    padding: 4px 1px;
    font-size: 12px;
    font-weight: 700;
  }
  .table th {
    font-weight: 700;
    padding-bottom: 7px;
  }
  .col-doviz {
    text-align: left;
    width: 20%;
  }
  .col-miktar {
    text-align: right;
    width: 25%;
  }
  .col-kur {
    text-align: right;
    width: 25%;
  }
  .col-tl {
    text-align: right;
    width: 30%;
  }
  .total-row td {
    border-top: 1px dashed #000 !important;
    padding-top: 7px;
    padding-bottom: 2px;
    font-size: 13px;
    font-weight: 700;
  }
  .col-total-label {
    text-align: left;
  }
  .col-total-val {
    text-align: right;
  }
</style>
</head>
<body>
  <div class="title">HESAP PUSULASI</div>
  <div class="meta">
    <span>Tarih: ${formattedDate}</span>
    <span>Saat: ${formattedTime}</span>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th class="col-doviz">Doviz</th>
        <th class="col-miktar">Miktari</th>
        <th class="col-kur">${rateLabel}</th>
        <th class="col-tl">TL Karsiligi</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2" class="col-total-label">TL Toplam</td>
        <td colspan="2" class="col-total-val">${formatNumber(tx.grandTotalTRY)}</td>
      </tr>
    </tfoot>
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
    document.body.removeChild(iframe);
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
  }, 150);
}