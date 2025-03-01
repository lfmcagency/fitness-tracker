export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const mealId = params.id;
    const food = await req.json();
    
    // For development, just return success
    return NextResponse.json({ 
      success: true, 
      data: { mealId: parseInt(mealId), food } 
    });
    
    // In production, we'd update the meal in MongoDB
    // const meal = await Meal.findOneAndUpdate(
    //   { _id: mealId, user: session.user.id },
    //   { $push: { foods: food } },
    //   { new: true }
    // );
    // 
    // if (!meal) {
    //   return NextResponse.json({ success: false, message: 'Meal not found' }, { status: 404 });
    // }
    // 
    // return NextResponse.json({ success: true, data: meal });
  } catch (error) {
    console.error('Error in POST /api/meals/[id]/foods:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error adding food to meal' 
    }, { status: 500 });
  }
}