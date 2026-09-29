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

// Satir genisligi (karakter). 70mm dot-matrix/termal serit icin guvenli deger.
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

  const d = new Date(tx.date);
  const tarih = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const saat = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  let rows: { code: string; amount: number; rate: number; total: number }[];
  if (tx.type === 'CROSS' && tx.cross) {
    rows = [
      {
        code: tx.cross.fromCode,
        amount: tx.cross.fromAmount,
        rate: tx.cross.fromRate,
        total: tx.cross.fromAmount * tx.cross.fromRate
      }
    ];
  } else if (Array.isArray(tx.items)) {
    rows = tx.items.map((it) => ({
      code: it.code,
      amount: it.amount,
      rate: it.rate,
      total: it.totalTRY
    }));
  } else {
    rows = [];
  }

  const header =
    'Doviz Miktari'.padEnd(C1) + kurBaslik.padStart(C2) + 'TL Karsiligi'.padStart(C3);

  const lines = rows.map(
    (r) =>
      `${money(r.amount)} ${ascii(r.code)}`.padEnd(C1) +
      rate(r.rate).padStart(C2) +
      money(r.total).padStart(C3)
  );

  // Guvenlik: items bos gelirse fis asla bos cikmasin
  if (lines.length === 0) {
    lines.push('TL Toplam'.padEnd(C1 + C2) + money(tx.grandTotalTRY || 0).padStart(C3));
  }

  return [
    `Tarih: ${tarih}   Saat: ${saat}`,
    center('HESAP PUSULASI'),
    sep,
    header,
    sep,
    ...lines
  ].join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A4 sayfa uzerinde sol-ust 70mm serit olarak basar.
 * (Yazici surucusunde rulo genisligi ayari olmadigi icin A4 seciliyor;
 * yazici icerik bitince durur, 2cm alt bosluk yirtma payi birakir.)
 */
export function buildReceiptHtml(tx: Transaction): string {
  const text = buildReceiptText(tx);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>HESAP PUSULASI</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  .strip {
    width: 70mm;
    padding: 20mm 4mm 20mm 4mm; /* ustten 2cm, alttan 2cm (yirtma payi) */
    overflow: hidden;
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
  <div class="strip"><pre>${esc(text)}</pre></div>
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
