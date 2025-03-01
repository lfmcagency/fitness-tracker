import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';

// GET - Fetch meals with optional filtering
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    
    // Build query
    const query: any = {};
    if (date) {
      // Convert date string to Date range for the entire day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Fetch meals
    const meals = await Meal.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Meal.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: meals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching meals' },
      { status: 500 }
    );
  }
}

// POST - Create new meal
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.userId || !body.name) {
      return NextResponse.json(
        { success: false, message: 'User ID and meal name are required' },
        { status: 400 }
      );
    }
    
    // Ensure date is a valid Date object
    if (body.date) {
      body.date = new Date(body.date);
    } else {
      body.date = new Date();
    }
    
    // Calculate nutrition totals if foods are present
    if (body.foods && Array.isArray(body.foods) && body.foods.length > 0) {
      body.totals = {
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0
      };
      
      body.foods.forEach((food: any) => {
        body.totals.protein += food.protein || 0;
        body.totals.carbs += food.carbs || 0;
        body.totals.fat += food.fat || 0;
        body.totals.calories += food.calories || 0;
      });
    }
    
    // Create new meal
    const meal = await Meal.create(body);
    
    return NextResponse.json(
      { success: true, data: meal },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { success: false, message: 'Error creating meal' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a meal
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Meal ID is required' },
        { status: 400 }
      );
    }
    
    const result = await Meal.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Meal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Meal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { success: false, message: 'Error deleting meal' },
      { status: 500 }
    );
  }
}

// PATCH - Update a meal
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Meal ID is required' },
        { status: 400 }
      );
    }
    
    // Ensure date is a valid Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    // Recalculate nutrition totals if foods are updated
    if (updateData.foods && Array.isArray(updateData.foods) && updateData.foods.length > 0) {
      updateData.totals = {
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0
      };
      
      updateData.foods.forEach((food: any) => {
        updateData.totals.protein += food.protein || 0;
        updateData.totals.carbs += food.carbs || 0;
        updateData.totals.fat += food.fat || 0;
        updateData.totals.calories += food.calories || 0;
      });
    }
    
    // Update the meal
    const meal = await Meal.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!meal) {
      return NextResponse.json(
        { success: false, message: 'Meal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: meal
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating meal' },
      { status: 500 }
    );
  }
}