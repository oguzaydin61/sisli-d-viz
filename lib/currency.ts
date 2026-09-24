export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  CHF: '₣',
  SAR: '﷼'
};

export const CURRENCY_NAMES: Record<string, string> = {
  TRY: 'Türk Lirası',
  USD: 'Amerikan Doları',
  EUR: 'Avrupa Euro',
  GBP: 'İngiliz Sterlini',
  CAD: 'Kanada Doları',
  CHF: 'İsviçre Frangı',
  SAR: 'Suudi Arabistan Riyali'
};

export function formatNumber(val: number | null | undefined, decimals: number = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val);
}

export function formatCurrency(
  val: number | null | undefined,
  currency: string = 'TRY',
  decimals: number = 2
): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${formatNumber(val, decimals)} ${sym}`;
}

export function formatRate(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0,0000';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(val);
}

export function parseFormattedNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(/,/g, '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Canlı giriş sırasında binlik ayracı (.) uygular; ondalık ayracı virgüldür (TR formatı)
// Örn: "3780" -> "3.780", "3780,5" -> "3.780,5"
export function formatLiveNumericInput(raw: string, maxDecimals: number = 2): string {
  if (!raw) return '';
  const clean = raw.replace(/[^\d,]/g, '');
  const commaIdx = clean.indexOf(',');
  const intPart = commaIdx === -1 ? clean : clean.slice(0, commaIdx);
  const decPart =
    commaIdx === -1 ? '' : clean.slice(commaIdx + 1).replace(/,/g, '').slice(0, maxDecimals);

  const strippedInt = intPart.replace(/^0+(?=\d)/, '');
  const grouped = strippedInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return commaIdx === -1 ? grouped : `${grouped},${decPart}`;
}

// Kur girişi temizliği: rakam + tek ondalık ayracı ('.' veya ',') dışındaki karakterleri atar
export function sanitizeRateInput(raw: string): string {
  if (!raw) return '';
  const clean = raw.replace(/[^\d.,]/g, '');
  const sepMatch = clean.match(/[.,]/);
  if (!sepMatch) return clean;
  const idx = clean.indexOf(sepMatch[0]);
  return clean.slice(0, idx + 1) + clean.slice(idx + 1).replace(/[.,]/g, '');
}

// Kur parse: hem '.' hem ',' ondalık ayracı olarak kabul edilir (binlik ayracı UYGULANMAZ)
export function parseRateInput(raw: string): number {
  if (!raw) return 0;
  const clean = raw.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Convert numbers to Turkish text representation for receipts
export function numberToTurkishText(num: number): string {
  const ones = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
  const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];

  function threeDigitsToText(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h === 1) res += 'YÜZ ';
    else if (h > 1) res += ones[h] + ' YÜZ ';

    if (t > 0) res += tens[t] + ' ';
    if (o > 0) res += ones[o] + ' ';

    return res.trim();
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  if (intPart === 0 && decPart === 0) return 'SIFIR TÜRK LİRASI';

  let result = '';
  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const remainder = intPart % 1000;

  if (millions > 0) {
    result += threeDigitsToText(millions) + ' MİLYON ';
  }

  if (thousands === 1) {
    result += 'BİN ';
  } else if (thousands > 1) {
    result += threeDigitsToText(thousands) + ' BİN ';
  }

  if (remainder > 0) {
    result += threeDigitsToText(remainder) + ' ';
  }

  result = result.trim() + ' TÜRK LİRASI';

  if (decPart > 0) {
    result += ' ' + threeDigitsToText(decPart) + ' KURUŞ';
  }

  return 'YALNIZ ' + result;
}
