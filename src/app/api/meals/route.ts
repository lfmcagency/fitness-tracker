// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // For development, use mock data
    const mockMeals = [
      {
        id: 1,
        name: "Breakfast",
        time: "08:00",
        foods: [
          { name: "Oatmeal", amount: 100, protein: 13, carbs: 68, fat: 7, calories: 389 },
          { name: "Protein Shake", amount: 30, protein: 24, carbs: 3, fat: 2, calories: 120 }
        ]
      },
      {
        id: 2,
        name: "Lunch",
        time: "13:00",
        foods: [
          { name: "Chicken Breast", amount: 200, protein: 62, carbs: 0, fat: 7, calories: 330 }
        ]
      }
    ];
    
    return NextResponse.json({ success: true, data: mockMeals });
  } catch (error) {
    console.error('Error in GET /api/meals:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching meals' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    
    // For development, just return mock data
    const mockMeal = {
      id: Date.now(),
      ...body,
      foods: body.foods || []
    };
    
    return NextResponse.json({ success: true, data: mockMeal }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/meals:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error creating meal' 
    }, { status: 500 });
  }
}