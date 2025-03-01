export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, seedDatabase, clearDatabase } from '@/lib/db/init-db';
import { getAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuth();
    
    // In production, only allow authenticated users
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get action from query params or body
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action') || 'init';
    
    let result;
    
    if (action === 'seed') {
      result = await seedDatabase();
    } else if (action === 'clear') {
      // Only allow clearing in development
      if (process.env.NODE_ENV !== 'production') {
        result = await clearDatabase();
      } else {
        return NextResponse.json({
          success: false,
          message: 'Cannot clear database in production'
        }, { status: 403 });
      }
    } else {
      result = await initDatabase();
    }
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ 
        success: false, 
        message: result.message || 'Failed to initialize database',
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error initializing database',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}