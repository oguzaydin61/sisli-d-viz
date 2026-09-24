export type TransactionType = 'BUY' | 'SELL' | 'CROSS';

export interface CurrencyItem {
  code: string;
  title: string;
  buy: number;
  sell: number;
}

export interface TransactionItem {
  code: string;
  title: string;
  amount: number;
  rate: number;
  standardRate: number;
  isNegotiated: boolean;
  totalTRY: number;
}

export interface Transaction {
  id: string; // e.g. "#004821"
  date: string;
  type: TransactionType;
  items: TransactionItem[];
  grandTotalTRY: number;
  cross?: CrossDetail; // CROSS (arbitraj) işlemlerinde çapraz detay
  operator: string;
  status: 'ACTIVE' | 'CANCELLED';
  notes?: string;
}

export interface CashboxBalances {
  TRY: number;
  USD: number;
  EUR: number;
  [code: string]: number;
}

export interface CrossDetail {
  fromCode: string;
  fromAmount: number;
  fromRate: number; // verilen dövizin TL karşılığı kuru (gişe alış)
  toCode: string;
  toAmount: number;
  toRate: number; // alınan dövizin TL karşılığı kuru (gişe satış)
  crossRate: number; // fromRate / toRate
}

export type ExpenseDirection = 'IN' | 'OUT';

export interface ExpenseEntry {
  id: string; // örn: "EXP-00001"
  date: string;
  direction: ExpenseDirection;
  currency: string;
  amount: number;
  category: string;
  notes?: string;
}

export interface DatabaseSchema {
  currencies: CurrencyItem[];
  cashbox: CashboxBalances;
  transactions: Transaction[];
  expenses: ExpenseEntry[];
  lastReceiptNumber?: number;
  lastExpenseNumber?: number;
}
