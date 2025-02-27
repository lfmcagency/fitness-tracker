// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const taskId = params.id;
    const updates = await req.json();
    
    // In production, we'd update the task in MongoDB
    // const task = await Task.findOneAndUpdate(
    //   { _id: taskId, user: session.user.id },
    //   updates,
    //   { new: true }
    // );
    
    // For development, just return success
    return NextResponse.json({ 
      success: true, 
      data: { id: parseInt(taskId), ...updates } 
    });
  } catch (error) {
    console.error('Error in PATCH /api/tasks/[id]:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error updating task' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const taskId = params.id;
    
    // In production, we'd delete from MongoDB
    // await Task.findOneAndDelete({ _id: taskId, user: session.user.id });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error deleting task' 
    }, { status: 500 });
  }
}