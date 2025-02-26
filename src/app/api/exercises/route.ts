// src/app/api/exercises/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  await dbConnect();
  const searchParams = req.nextUrl.searchParams;
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  
  const query: any = {};
  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;
  
  try {
    const exercises = await Exercise.find(query)
      .sort({ progressionLevel: 1 });
    return NextResponse.json({ success: true, data: exercises });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error fetching exercises' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated (and has admin role in production)
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const exercise = await Exercise.create(body);
    return NextResponse.json({ success: true, data: exercise }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error creating exercise' }, { status: 400 });
  }
}