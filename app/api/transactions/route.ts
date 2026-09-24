import { NextResponse } from 'next/server';
import { createTransaction, createCrossTransaction, deleteTransaction } from '@/lib/db';
import { TransactionItem, TransactionType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, items, grandTotalTRY, operator, notes, cross } = body;

    // === CROSS / ARBİTRAJ İŞLEMİ ===
    if (type === 'CROSS') {
      const fromAmount = Number(cross?.fromAmount);
      const fromRate = Number(cross?.fromRate);
      const toAmount = Number(cross?.toAmount);
      const toRate = Number(cross?.toRate);

      if (!cross?.fromCode || !cross?.toCode) {
        return NextResponse.json(
          { success: false, error: 'Çapraz işlem için verilen ve alınan döviz seçilmelidir.' },
          { status: 400 }
        );
      }

      if ([fromAmount, fromRate, toAmount, toRate].some((n) => isNaN(n) || n <= 0)) {
        return NextResponse.json(
          { success: false, error: 'Çapraz işlem miktar ve kurları 0’dan büyük olmalıdır.' },
          { status: 400 }
        );
      }

      const result = await createCrossTransaction({
        fromCode: String(cross.fromCode).toUpperCase().trim(),
        fromAmount,
        fromRate,
        toCode: String(cross.toCode).toUpperCase().trim(),
        toAmount,
        toRate,
        operator: operator || 'Gişe 1',
        notes: notes || ''
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `${result.transaction.id} numaralı çapraz (arbitraj) işlem kaydedildi.`
      });
    }

    // === KLASİK ALIŞ / SATIŞ İŞLEMİ ===
    if (!type || (type !== 'BUY' && type !== 'SELL')) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz işlem türü (ALIŞ veya SATIŞ)' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'İşlem yapılacak en az 1 satır döviz girmelisiniz.' },
        { status: 400 }
      );
    }

    const validatedItems: TransactionItem[] = [];
    for (const it of items) {
      const amount = Number(it.amount);
      const rate = Number(it.rate);
      const totalTRY = Number(it.totalTRY);

      if (!it.code || isNaN(amount) || amount <= 0 || isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Satırdaki döviz bilgisi eksik veya geçersiz: ${it.code || 'Bilinmeyen'}`
          },
          { status: 400 }
        );
      }

      validatedItems.push({
        code: String(it.code).toUpperCase().trim(),
        title: String(it.title || '').trim(),
        amount: Number(amount.toFixed(2)),
        rate: Number(rate.toFixed(4)),
        standardRate: Number(Number(it.standardRate || rate).toFixed(4)),
        isNegotiated: Boolean(it.isNegotiated),
        totalTRY: Number(totalTRY.toFixed(2))
      });
    }

    const calculatedTotal = validatedItems.reduce((acc, curr) => acc + curr.totalTRY, 0);
    const totalToSave = Number(
      (grandTotalTRY ? Number(grandTotalTRY) : calculatedTotal).toFixed(2)
    );

    const result = await createTransaction({
      type: type as TransactionType,
      items: validatedItems,
      grandTotalTRY: totalToSave,
      operator: operator || 'Gişe 1',
      notes: notes || ''
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.transaction.id} numaralı fiş başarıyla kaydedildi.`
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'İşlem kaydedilemedi';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// İşlem iptali: kasa etkisi otomatik geri alınır
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Silinecek işlem ID belirtilmedi.' },
        { status: 400 }
      );
    }

    const result = await deleteTransaction(id);
    return NextResponse.json({
      success: true,
      data: result,
      message: `${id} iptal edildi, kasa etkisi geri alındı.`
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'İşlem iptal edilemedi';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
