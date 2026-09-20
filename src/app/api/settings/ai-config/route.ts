import { NextRequest, NextResponse } from 'next/server';
import { getAIProviderConfig } from '@/lib/config/ai';

export async function GET(req: NextRequest) {
  try {
    const config = getAIProviderConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
