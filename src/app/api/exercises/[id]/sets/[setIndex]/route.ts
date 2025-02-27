// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string, setIndex: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, skip authentication check
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const exerciseId = params.id;
    const setIndex = parseInt(params.setIndex);
    const updates = await req.json();
    
    // For development, just return success
    return NextResponse.json({ 
      success: true, 
      data: { id: parseInt(exerciseId), setIndex, updates } 
    });
  } catch (error) {
    console.error('Error in PATCH /api/exercises/[id]/sets/[setIndex]:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error updating exercise set' 
    }, { status: 500 });
  }
}