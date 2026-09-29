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

// Satir genisligi (karakter). 70mm termal/dot-matrix icin guvenli deger.
const W = 40;
// Kolon genislikleri: 16 (miktar) + 11 (kur) + 13 (TL karsiligi) = 40
const C1 = 16;
const C2 = 11;
const C3 = 13;

function center(s: string): string {
  const pad = Math.max(0, Math.floor((W - s.length) / 2));
  return ' '.repeat(pad) + s;
}

/**
 * Fisi SAF MONOSPACE METIN olarak uretir (nokta vuruslu / dot-matrix
 * yazicilarin ana dili). Kolon hizasi karakter bosluklariyla kurulur;
 * HTML tablo veya CSS layout kullanilmaz.
 */
function buildReceiptText(tx: Transaction): string {
  const kurBaslik = tx.type === 'BUY' ? 'Alis Kuru' : 'Satis Kuru';
  const sep = '-'.repeat(W);

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

  const header =
    'Doviz Miktari'.padEnd(C1) + kurBaslik.padStart(C2) + 'TL Karsiligi'.padStart(C3);

  const lines = rows.map(
    (r) =>
      `${money(r.amount)} ${ascii(r.code)}`.padEnd(C1) +
      rate(r.rate).padStart(C2) +
      money(r.total).padStart(C3)
  );

  return [center('HESAP PUSULASI'), sep, header, sep, ...lines].join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildReceiptHtml(tx: Transaction): string {
  const text = buildReceiptText(tx);

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
  }
  pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 9px;
    font-weight: 700;
    line-height: 1.6;
    white-space: pre;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>
<pre>${esc(text)}</pre>
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
