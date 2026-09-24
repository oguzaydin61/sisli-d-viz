import fs from 'fs/promises';
import path from 'path';
import {
  CashboxBalances,
  DatabaseSchema,
  CurrencyItem,
  ExpenseDirection,
  ExpenseEntry,
  Transaction,
  TransactionItem,
  TransactionType
} from './types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const DEFAULT_DB: DatabaseSchema = {
  currencies: [
    { code: 'USD', title: 'Amerikan Doları', buy: 34.25, sell: 34.40 },
    { code: 'EUR', title: 'Avrupa Euro', buy: 37.12, sell: 37.28 },
    { code: 'GBP', title: 'İngiliz Sterlini', buy: 44.80, sell: 45.10 },
    { code: 'CAD', title: 'Kanada Doları', buy: 25.10, sell: 25.40 }
  ],
  cashbox: {
    TRY: 0,
    USD: 0,
    EUR: 0,
    GBP: 0,
    CAD: 0
  },
  transactions: [],
  expenses: [],
  lastReceiptNumber: 4820,
  lastExpenseNumber: 0
};

// In-memory Promise Mutex Queue to guarantee atomicity and avoid concurrency corruption
let lockQueue: Promise<void> = Promise.resolve();

export function runWithLock<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    lockQueue = lockQueue
      .then(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// ============================================================
// STORAGE ADAPTER: Uzak Redis (Vercel canlı) veya db.json (yerel geliştirme)
// Şu ortam değişkenleri tanımlıysa uzak Redis kullanılır:
//   KV_REST_API_URL / KV_REST_API_TOKEN           (Vercel KV uyumlu)
//   veya UPSTASH_REDIS_REST_URL / _TOKEN          (Upstash entegrasyonu)
// Tanımlı değilse proje kökündeki data/db.json'a yazılır.
// ============================================================
const REMOTE_KEY = 'bimay_fx_db';

interface RemoteConfig {
  url: string;
  token: string;
}

// Ortam değişkenleri her çağrıda taze okunur (serverless cold-start uyumlu)
function getRemoteConfig(): RemoteConfig | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url, token };
  return null;
}

const MISSING_REMOTE_ERROR =
  'Veritabanı yapılandırılmamış: Vercel > Storage üzerinden Upstash Redis oluşturup projeye bağlayın ve yeniden deploy edin. (KV_REST_API_URL / KV_REST_API_TOKEN eksik)';

async function remoteRead(cfg: RemoteConfig): Promise<DatabaseSchema | null> {
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({ url: cfg.url, token: cfg.token });
  const data = await redis.get<DatabaseSchema>(REMOTE_KEY);
  return data ?? null;
}

async function remoteWrite(cfg: RemoteConfig, data: DatabaseSchema): Promise<void> {
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({ url: cfg.url, token: cfg.token });
  await redis.set(REMOTE_KEY, data);
}

function normalizeDb(parsed: Partial<DatabaseSchema> | null): DatabaseSchema {
  const p = parsed || {};
  return {
    currencies: p.currencies || DEFAULT_DB.currencies,
    cashbox: { ...DEFAULT_DB.cashbox, ...(p.cashbox || {}) },
    transactions: p.transactions || [],
    expenses: p.expenses || [],
    lastReceiptNumber: p.lastReceiptNumber || 4820,
    lastExpenseNumber: p.lastExpenseNumber || 0
  };
}

async function ensureDbExists(): Promise<void> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring DB exists:', error);
  }
}

export async function readDb(): Promise<DatabaseSchema> {
  const remoteCfg = getRemoteConfig();

  // === UZAK DEPOLAMA (Vercel / Upstash Redis) ===
  if (remoteCfg) {
    try {
      const remote = await remoteRead(remoteCfg);
      if (!remote) {
        // İlk çalıştırma: varsayılan veri setiyle tohumla
        await remoteWrite(remoteCfg, DEFAULT_DB);
        return DEFAULT_DB;
      }
      return normalizeDb(remote);
    } catch (error) {
      console.error('Remote DB read error:', error);
      throw new Error('Uzak veritabanına (Redis) bağlanılamadı. Yapılandırmayı kontrol edin.');
    }
  }

  // Vercel'de Redis yapılandırılmamışsa dosya sistemi salt-okunurdur: net hata ver
  if (process.env.VERCEL) {
    throw new Error(MISSING_REMOTE_ERROR);
  }

  // === YEREL DOSYA (geliştirme ortamı) ===
  await ensureDbExists();
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    return normalizeDb(JSON.parse(raw));
  } catch (error) {
    console.error('Error reading DB, returning defaults:', error);
    return DEFAULT_DB;
  }
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  const remoteCfg = getRemoteConfig();
  if (remoteCfg) {
    await remoteWrite(remoteCfg, data);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(MISSING_REMOTE_ERROR);
  }
  await ensureDbExists();
  const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempFile, DB_FILE);
}

export async function getDbData(): Promise<DatabaseSchema & { nextReceiptId: string }> {
  return runWithLock(async () => {
    const db = await readDb();
    const nextNum = (db.lastReceiptNumber || 4820) + 1;
    const nextReceiptId = `#${String(nextNum).padStart(6, '0')}`;
    return {
      ...db,
      nextReceiptId
    };
  });
}

export async function updateCurrencies(currencies: CurrencyItem[]): Promise<CurrencyItem[]> {
  return runWithLock(async () => {
    const db = await readDb();
    db.currencies = currencies;
    // Yeni eklenen para birimleri için kasa hesabı otomatik açılır
    const cashbox: CashboxBalances = { ...db.cashbox };
    for (const c of currencies) {
      if (typeof cashbox[c.code] !== 'number') cashbox[c.code] = 0;
    }
    db.cashbox = cashbox;
    await writeDb(db);
    return db.currencies;
  });
}

export async function createTransaction(params: {
  type: TransactionType;
  items: TransactionItem[];
  grandTotalTRY: number;
  operator?: string;
  notes?: string;
}): Promise<{ transaction: Transaction; nextReceiptId: string; cashbox: CashboxBalances }> {
  return runWithLock(async () => {
    const db = await readDb();
    const currentNum = (db.lastReceiptNumber || 4820) + 1;
    db.lastReceiptNumber = currentNum;
    const txId = `#${String(currentNum).padStart(6, '0')}`;

    const newTx: Transaction = {
      id: txId,
      date: new Date().toISOString(),
      type: params.type,
      items: params.items,
      grandTotalTRY: Number(params.grandTotalTRY.toFixed(2)),
      operator: params.operator || 'Gişe 1',
      status: 'ACTIVE',
      notes: params.notes || ''
    };

    // STRICT CASHBOX GUARD: Satışta kasada yeterli döviz olmalı, yoksa işlem engellenir
    if (params.type === 'SELL') {
      for (const item of params.items) {
        const available = db.cashbox[item.code] || 0;
        if (available < item.amount) {
          throw new Error(
            `Yetersiz Kasa Bakiyesi: Kasada ${available.toLocaleString('tr-TR')} ${item.code} bulunmaktadır`
          );
        }
      }
    }

    // Kasa bakiyelerini işleme göre güncelle
    // BUY (ALIŞ): Müşteriden döviz alınır -> kasaya döviz girer, TL çıkar
    // SELL (SATIŞ): Müşteriye döviz satılır -> kasadan döviz çıkar, TL girer
    const cashbox: CashboxBalances = { ...db.cashbox };
    for (const item of params.items) {
      const fxDelta = params.type === 'BUY' ? item.amount : -item.amount;
      cashbox[item.code] = Number(((cashbox[item.code] || 0) + fxDelta).toFixed(2));
    }
    const tryDelta = params.type === 'BUY' ? -newTx.grandTotalTRY : newTx.grandTotalTRY;
    cashbox.TRY = Number(((cashbox.TRY || 0) + tryDelta).toFixed(2));
    db.cashbox = cashbox;

    db.transactions.unshift(newTx);
    await writeDb(db);

    const nextReceiptId = `#${String(currentNum + 1).padStart(6, '0')}`;

    return {
      transaction: newTx,
      nextReceiptId,
      cashbox
    };
  });
}

// CROSS (Arbitraj): Kasadan verilen döviz düşer, alınan döviz kasaya girer
export async function createCrossTransaction(params: {
  fromCode: string;
  fromAmount: number;
  fromRate: number;
  toCode: string;
  toAmount: number;
  toRate: number;
  operator?: string;
  notes?: string;
}): Promise<{ transaction: Transaction; nextReceiptId: string; cashbox: CashboxBalances }> {
  return runWithLock(async () => {
    const db = await readDb();

    const fromCode = params.fromCode.toUpperCase();
    const toCode = params.toCode.toUpperCase();
    if (fromCode === toCode) {
      throw new Error('Verilen ve alınan döviz aynı olamaz.');
    }

    const available = db.cashbox[fromCode] || 0;
    if (available < params.fromAmount) {
      throw new Error(
        `Yetersiz Kasa Bakiyesi: Kasada ${available.toLocaleString('tr-TR')} ${fromCode} bulunmaktadır`
      );
    }

    const currentNum = (db.lastReceiptNumber || 4820) + 1;
    db.lastReceiptNumber = currentNum;
    const txId = `#${String(currentNum).padStart(6, '0')}`;

    const crossRate = params.toRate > 0 ? Number((params.fromRate / params.toRate).toFixed(6)) : 0;

    const newTx: Transaction = {
      id: txId,
      date: new Date().toISOString(),
      type: 'CROSS',
      items: [],
      grandTotalTRY: Number((params.fromAmount * params.fromRate).toFixed(2)),
      cross: {
        fromCode,
        fromAmount: Number(params.fromAmount.toFixed(2)),
        fromRate: params.fromRate,
        toCode,
        toAmount: Number(params.toAmount.toFixed(2)),
        toRate: params.toRate,
        crossRate
      },
      operator: params.operator || 'Gişe 1',
      status: 'ACTIVE',
      notes: params.notes || ''
    };

    const cashbox: CashboxBalances = { ...db.cashbox };
    cashbox[fromCode] = Number(((cashbox[fromCode] || 0) - params.fromAmount).toFixed(2));
    cashbox[toCode] = Number(((cashbox[toCode] || 0) + params.toAmount).toFixed(2));
    db.cashbox = cashbox;

    db.transactions.unshift(newTx);
    await writeDb(db);

    return {
      transaction: newTx,
      nextReceiptId: `#${String(currentNum + 1).padStart(6, '0')}`,
      cashbox
    };
  });
}

// Kasa Giriş/Çıkış & Masraf kaydı
export async function createExpense(params: {
  direction: ExpenseDirection;
  currency: string;
  amount: number;
  category: string;
  notes?: string;
}): Promise<{ expense: ExpenseEntry; cashbox: CashboxBalances }> {
  return runWithLock(async () => {
    const db = await readDb();
    const currency = params.currency.toUpperCase();

    if (params.direction === 'OUT' && (db.cashbox[currency] || 0) < params.amount) {
      throw new Error(
        `Yetersiz Kasa Bakiyesi: Kasada ${(db.cashbox[currency] || 0).toLocaleString('tr-TR')} ${currency} bulunmaktadır`
      );
    }

    const num = (db.lastExpenseNumber || 0) + 1;
    db.lastExpenseNumber = num;

    const entry: ExpenseEntry = {
      id: `EXP-${String(num).padStart(5, '0')}`,
      date: new Date().toISOString(),
      direction: params.direction,
      currency,
      amount: Number(params.amount.toFixed(2)),
      category: params.category,
      notes: params.notes || ''
    };

    const delta = params.direction === 'IN' ? entry.amount : -entry.amount;
    const cashbox: CashboxBalances = { ...db.cashbox };
    cashbox[currency] = Number(((cashbox[currency] || 0) + delta).toFixed(2));
    db.cashbox = cashbox;

    db.expenses.unshift(entry);
    await writeDb(db);

    return { expense: entry, cashbox };
  });
}

// İşlem iptali: kasaya/cariye yapılan etki otomatik geri alınır
export async function deleteTransaction(id: string): Promise<{ cashbox: CashboxBalances }> {
  return runWithLock(async () => {
    const db = await readDb();
    const tx = db.transactions.find((t) => t.id === id);
    if (!tx) throw new Error('İşlem bulunamadı: ' + id);

    const cashbox: CashboxBalances = { ...db.cashbox };

    if (tx.type === 'CROSS' && tx.cross) {
      // Çapraz işlemin tersi: verilen geri gelir, alınan geri çıkar
      cashbox[tx.cross.fromCode] = Number(
        ((cashbox[tx.cross.fromCode] || 0) + tx.cross.fromAmount).toFixed(2)
      );
      cashbox[tx.cross.toCode] = Number(
        ((cashbox[tx.cross.toCode] || 0) - tx.cross.toAmount).toFixed(2)
      );
    } else if (tx.type === 'BUY') {
      // Alışın tersi: kasadan döviz düşülür, TL geri eklenir
      for (const item of tx.items) {
        cashbox[item.code] = Number(((cashbox[item.code] || 0) - item.amount).toFixed(2));
      }
      cashbox.TRY = Number(((cashbox.TRY || 0) + tx.grandTotalTRY).toFixed(2));
    } else if (tx.type === 'SELL') {
      // Satışın tersi: döviz kasaya geri girer, TL kasadan düşülür
      for (const item of tx.items) {
        cashbox[item.code] = Number(((cashbox[item.code] || 0) + item.amount).toFixed(2));
      }
      cashbox.TRY = Number(((cashbox.TRY || 0) - tx.grandTotalTRY).toFixed(2));
    }

    db.cashbox = cashbox;
    db.transactions = db.transactions.filter((t) => t.id !== id);
    await writeDb(db);

    return { cashbox };
  });
}

// Kasa hareketi (giriş/masraf) iptali: etkisi geri alınır
export async function deleteExpense(id: string): Promise<{ cashbox: CashboxBalances }> {
  return runWithLock(async () => {
    const db = await readDb();
    const exp = db.expenses.find((e) => e.id === id);
    if (!exp) throw new Error('Kasa hareketi bulunamadı: ' + id);

    const reversal = exp.direction === 'IN' ? -exp.amount : exp.amount;
    const cashbox: CashboxBalances = { ...db.cashbox };
    cashbox[exp.currency] = Number(((cashbox[exp.currency] || 0) + reversal).toFixed(2));
    db.cashbox = cashbox;

    db.expenses = db.expenses.filter((e) => e.id !== id);
    await writeDb(db);

    return { cashbox };
  });
}
