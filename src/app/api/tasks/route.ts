// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task from '@/models/Task';
import { getAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access even without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    // For development, use mock data while we set up the user system fully
    // Later we'll replace this with a proper MongoDB query
    const mockTasks = [
      { id: 1, name: "Morning Weigh-in", time: "06:00", completed: false, streak: 7 },
      { id: 2, name: "Vitamin D + K2", time: "07:00", completed: false, streak: 12 },
      { id: 3, name: "Cold Shower", time: "07:15", completed: false, streak: 5 },
      { id: 4, name: "Mobility Work", time: "08:00", completed: false, streak: 3 },
      { id: 5, name: "Magnesium + Zinc", time: "22:00", completed: false, streak: 15 }
    ];
    
    return NextResponse.json({ success: true, data: mockTasks });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching tasks' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access even without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    
    // In a production app, we'd create a real task in MongoDB:
    // const task = await Task.create({
    //   ...body,
    //   user: session.user.id
    // });
    
    // For now, we'll just echo back the request with an ID
    const mockTask = {
      id: Date.now(),
      ...body
    };
    
    return NextResponse.json({ success: true, data: mockTask }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error creating task' 
    }, { status: 500 });
  }
}