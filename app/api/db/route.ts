import { NextResponse } from 'next/server';
import { getDbData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDbData();
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Veritabanı okunamadı';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
