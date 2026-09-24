'use client';

import { Transaction } from './types';
import { formatCurrency, formatNumber, formatRate, numberToTurkishText } from './currency';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * 70x100mm tek sayfa fişi, tamamen bağımsız bir HTML belgesi olarak üretir.
 * Uygulamanın hiçbir CSS'i bu belgeye karışmaz.
 */
export function buildReceiptHtml(tx: Transaction): string {
  const date = new Date(tx.date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const typeLabel =
    tx.type === 'BUY'
      ? 'DÖVİZ ALIŞ (BİZ ALDIK)'
      : tx.type === 'SELL'
      ? 'DÖVİZ SATIŞ (BİZ SATTIK)'
      : 'DÖVİZ TAKAS (CROSS)';

  let itemsHtml = '';
  if (tx.type === 'CROSS' && tx.cross) {
    itemsHtml = `
      <div class="row bold"><span>VERİLEN:</span><span>${formatNumber(tx.cross.fromAmount)} ${esc(tx.cross.fromCode)}</span></div>
      <div class="row small"><span>Kur: ${formatRate(tx.cross.fromRate)} TL</span><span></span></div>
      <div class="row bold"><span>ALINAN:</span><span>${formatNumber(tx.cross.toAmount)} ${esc(tx.cross.toCode)}</span></div>
      <div class="row small"><span>Kur: ${formatRate(tx.cross.toRate)} TL</span><span>1 ${esc(tx.cross.fromCode)} = ${formatRate(tx.cross.crossRate)} ${esc(tx.cross.toCode)}</span></div>
      <div class="row black big total"><span>İŞLEM DEĞERİ:</span><span>${formatCurrency(tx.grandTotalTRY, 'TRY')}</span></div>`;
  } else {
    itemsHtml =
      tx.items
        .map(
          (item) => `
      <div class="row bold" style="font-size:10px"><span>${esc(item.code)} - ${esc(item.title)}</span><span>${formatNumber(item.amount)}</span></div>
      <div class="row small"><span>Kur: ${formatRate(item.rate)}${item.isNegotiated ? ' (P)' : ''}</span><span class="bold" style="color:#000">${formatCurrency(item.totalTRY, 'TRY')}</span></div>`
        )
        .join('') +
      `
      <div class="row black big total"><span>GENEL TOPLAM:</span><span>${formatCurrency(tx.grandTotalTRY, 'TRY')}</span></div>`;
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Fis ${esc(tx.id)}</title>
<style>
  @page { size: 70mm 100mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: #fff;
    width: 70mm;
    height: 100mm;
    overflow: hidden; /* TEK SAYFA GARANTİSİ: taşan içerik 2. sayfaya asla geçmez */
  }
  body {
    padding: 1.2mm 3mm;
    font-family: "Courier New", Courier, monospace;
    color: #000;
    font-size: 9px;
    line-height: 1.2;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .black { font-weight: 900; }
  .big { font-size: 11px; }
  .small { font-size: 8px; color: #444; }
  .tiny { font-size: 7px; color: #444; }
  .b { border-bottom: 1px dashed #666; padding-bottom: 4px; margin-bottom: 4px; }
  .total { border-top: 1px dashed #666; margin-top: 2px; padding-top: 3px; }
  .banner { background: #eee; border: 1px solid #999; text-align: center; font-weight: 700; font-size: 9px; padding: 3px 2px; margin: 3px 0; }
  .sig { display: flex; gap: 8px; text-align: center; font-size: 8px; padding-top: 4px; }
  .sig > div { flex: 1; }
  .sig .line { height: 14px; border-bottom: 1px dotted #666; margin-top: 2px; }
</style>
</head>
<body>
  <div class="center b">
    <div class="black" style="font-size:13px">BİMAY DÖVİZ A.Ş.</div>
    <div class="small">A Grubu Yetkili Müessese • Şişli / İSTANBUL</div>
    <div class="small">Tel: 0212 555 44 33</div>
  </div>

  <div class="b" style="padding:4px 0">
    <div class="row black" style="font-size:10px"><span>FİŞ NO:</span><span>${esc(tx.id)}</span></div>
    <div class="row small"><span>TARİH:</span><span>${date}</span></div>
    <div class="row small"><span>GİŞE:</span><span>${esc(tx.operator || 'Gişe 1')}</span></div>
  </div>

  <div class="banner">★ ${typeLabel} ★</div>

  <div class="b" style="padding-bottom:4px">
    ${itemsHtml}
  </div>

  <div class="tiny center b" style="font-style:italic;font-weight:700;padding-bottom:4px">
    ${esc(numberToTurkishText(tx.grandTotalTRY))}
  </div>

  <div class="sig b" style="padding-bottom:4px">
    <div><div class="bold">GİŞE YETKİLİSİ</div><div class="line"></div></div>
    <div><div class="bold">MÜŞTERİ</div><div class="line"></div></div>
  </div>

  <div class="center" style="padding-top:3px">
    <div class="tiny">Parayı gişeden ayrılmadan sayarak teslim alınız. Bilgi fişidir.</div>
    <div class="bold" style="font-size:8px">BİMAY DÖVİZ OTOMASYONU</div>
  </div>
</body>
</html>`;
}

/**
 * Fişi izole bir iframe belgesine yazıp yalnızca o belgeyi yazdırır.
 * Uygulama DOM'u ve CSS'i yazdırmaya asla karışmaz -> tek sayfa, tek fiş.
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
