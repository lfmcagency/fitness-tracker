import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ success: true, message: 'Database connected successfully!' });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ success: false, message: 'Failed to connect to database' }, { status: 500 });
  }
}