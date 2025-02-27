// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, use mock data even if not authenticated
    // In production, we would require authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    // Mock data for development
    const mockProgressData = {
      performanceData: [
        { date: "02/10", pushups: 18, pullups: 10, weight: 76.2 },
        { date: "02/12", pushups: 20, pullups: 11, weight: 75.8 },
        { date: "02/14", pushups: 19, pullups: 12, weight: 75.5 },
        { date: "02/16", pushups: 22, pullups: 12, weight: 75.2 },
        { date: "02/17", pushups: 23, pullups: 13, weight: 75.5 },
      ],
      achievements: [
        { id: 1, title: "20+ Push-ups", date: "Feb 12", type: "strength" },
        { id: 2, title: "Sub 76kg Weight", date: "Feb 14", type: "weight" },
        { id: 3, title: "10+ Pull-ups", date: "Feb 10", type: "strength" },
      ],
      metrics: {
        currentWeight: 75.5,
        weightChange: -0.7,
        maxPushups: 23,
        pushupChange: 3,
        trainingDays: 5
      }
    };
    
    return NextResponse.json({ 
      success: true, 
      data: mockProgressData 
    });
  } catch (error) {
    console.error('Error in GET /api/progress:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching progress data' 
    }, { status: 500 });
  }
}