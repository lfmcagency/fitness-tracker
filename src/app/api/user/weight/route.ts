export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import { getAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const { weight } = await req.json();
    
    // For development, just return success
    return NextResponse.json({ 
      success: true, 
      data: { weight } 
    });
    
    // In production, we'd update the user in MongoDB
    // const user = await User.findById(session.user.id);
    // 
    // if (!user) {
    //   return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    // }
    // 
    // user.bodyweight.push({
    //   weight: parseFloat(weight),
    //   date: new Date()
    // });
    // 
    // await user.save();
    // 
    // return NextResponse.json({ success: true, data: user.bodyweight });
  } catch (error) {
    console.error('Error in POST /api/user/weight:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error updating weight' 
    }, { status: 500 });
  }
}