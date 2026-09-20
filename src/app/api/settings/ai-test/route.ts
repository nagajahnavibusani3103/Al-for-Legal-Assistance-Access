import { NextRequest, NextResponse } from 'next/server';
import { testServerAIConnection } from '@/lib/config/ai';

export async function POST(req: NextRequest) {
  try {
    const result = await testServerAIConnection();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, latencyMs: 0 }, { status: 500 });
  }
}
