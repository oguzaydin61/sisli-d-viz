import { NextResponse } from 'next/server';
import { createExpense, deleteExpense } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { direction, currency, amount, category, notes } = body;

    if (direction !== 'IN' && direction !== 'OUT') {
      return NextResponse.json(
        { success: false, error: 'Geçersiz işlem tipi (Giriş veya Çıkış olmalı).' },
        { status: 400 }
      );
    }

    if (!currency || !String(currency).trim()) {
      return NextResponse.json(
        { success: false, error: 'Para birimi seçilmedi.' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Tutar 0’dan büyük olmalıdır.' },
        { status: 400 }
      );
    }

    if (!category || !String(category).trim()) {
      return NextResponse.json(
        { success: false, error: 'Açıklama / kategori girilmelidir.' },
        { status: 400 }
      );
    }

    const result = await createExpense({
      direction,
      currency: String(currency).toUpperCase().trim(),
      amount: numAmount,
      category: String(category).trim(),
      notes: notes ? String(notes).trim() : ''
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.expense.id} numaralı kasa hareketi kaydedildi.`
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Kasa hareketi kaydedilemedi';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Kasa hareketi iptali: bakiye etkisi geri alınır
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Silinecek hareket ID belirtilmedi.' },
        { status: 400 }
      );
    }

    const result = await deleteExpense(id);
    return NextResponse.json({
      success: true,
      data: result,
      message: `${id} iptal edildi, kasa etkisi geri alındı.`
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Hareket iptal edilemedi';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
