import { NextResponse } from 'next/server';
import { updateCurrencies, readDb } from '@/lib/db';
import { CurrencyItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body) {
      return NextResponse.json({ success: false, error: 'Geçersiz veri' }, { status: 400 });
    }

    let updatedList: CurrencyItem[] = [];

    // If body is an array of currencies
    if (Array.isArray(body)) {
      updatedList = body.map((c) => ({
        code: String(c.code).toUpperCase().trim(),
        title: String(c.title).trim(),
        buy: Number(Number(c.buy).toFixed(4)),
        sell: Number(Number(c.sell).toFixed(4))
      }));
    } else if (typeof body === 'object') {
      // If key-value map
      const db = await readDb();
      updatedList = db.currencies.map((curr) => {
        if (body[curr.code]) {
          return {
            ...curr,
            buy: Number(Number(body[curr.code].buy).toFixed(4)),
            sell: Number(Number(body[curr.code].sell).toFixed(4))
          };
        }
        return curr;
      });
    }

    const saved = await updateCurrencies(updatedList);
    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Kurlar başarıyla güncellendi'
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Kurlar güncellenirken hata oluştu';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
