export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Just a placeholder login endpoint
  const body = await req.json();
  
  if (body.email === 'test@example.com' && body.password === 'password') {
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ success: false }, { status: 401 });
}