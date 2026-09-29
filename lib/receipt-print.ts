'use client';

import { Transaction } from './types';

/**
 * Turkce karakterleri ASCII esdegerine cevirir.
 */
function ascii(s: string): string {
  return s
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O');
}

function money(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

function rate(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(n);
}

/**
 * 70mm x 70mm tek sayfa HESAP PUSULASI.
 * Icerik: SADECE "HESAP PUSULASI" basligi + Doviz Miktari / Alis veya Satis Kuru / TL Karsiligi tablosu.
 * Ustten ve alttan 2cm bosluk birakilir; boylece son satir bir sonraki fise kaymaz.
 * Turkce karakter ve baska hicbir yazi/sembol kullanilmaz.
 */
export function buildReceiptHtml(tx: Transaction): string {
  const kurBaslik = tx.type === 'BUY' ? 'Alis Kuru' : 'Satis Kuru';

  const rows =
    tx.type === 'CROSS' && tx.cross
      ? [
          {
            code: tx.cross.fromCode,
            amount: tx.cross.fromAmount,
            rate: tx.cross.fromRate,
            total: tx.cross.fromAmount * tx.cross.fromRate
          }
        ]
      : tx.items.map((it) => ({
          code: it.code,
          amount: it.amount,
          rate: it.rate,
          total: it.totalTRY
        }));

  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td>${money(r.amount)} ${ascii(r.code)}</td>
        <td class="right">${rate(r.rate)}</td>
        <td class="right">${money(r.total)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>HESAP PUSULASI</title>
<style>
  @page { size: 70mm 70mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  body {
    width: 70mm;
    height: 70mm;
    overflow: hidden; /* tek sayfa: tasan icerik sonraki fise gecmez */
    padding: 20mm 3mm; /* ustten 2cm, alttan 2cm bosluk */
    font-family: "Courier New", Courier, monospace;
    color: #000;
    font-size: 8px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .title {
    text-align: center;
    font-weight: 900;
    font-size: 10px;
    letter-spacing: 1px;
    border-bottom: 1px dashed #000;
    padding-bottom: 1.5mm;
    margin-bottom: 2.5mm;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-weight: 900;
    font-size: 7.5px;
    border-bottom: 1px solid #000;
    padding: 1mm 0;
  }
  td { padding: 1.4mm 0; vertical-align: top; }
  .right { text-align: right; }
</style>
</head>
<body>
  <div class="title">HESAP PUSULASI</div>
  <table>
    <thead>
      <tr>
        <th>Doviz Miktari</th>
        <th class="right">${ascii(kurBaslik)}</th>
        <th class="right">TL Karsiligi</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Fisi izole bir iframe belgesine yazip yalnizca o belgeyi yazdirir.
 * Uygulama DOM'u ve CSS'i yazdirmaya asla karismaz -> tek sayfa, tek fis.
 */
export function printTransactionReceipt(tx: Transaction): void {
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
  doc.write(buildReceiptHtml(tx));
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
