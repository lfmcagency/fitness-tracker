import { NextRequest, NextResponse } from "next/server";
import { getAuth, getUserById } from "@/lib/auth";
import { dbConnect } from '@/lib/db/mongodb';
import User from "@/models/User";
import bcrypt from 'bcrypt';

// GET: Get current user profile
export async function GET() {
  try {
    // Get the authenticated user from the session
    const session = await getAuth();
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user data from database (excluding sensitive info)
    const userData = await getUserById(session.user.id);
    
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PUT: Update user profile data
export async function PUT(req: NextRequest) {
  try {
    // Get the authenticated user from the session
    const session = await getAuth();
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const body = await req.json();
    
    // Connect to database
    await dbConnect();
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Fields that are allowed to be updated
    const allowedUpdates = ['name', 'image', 'settings'];
    const updates: Record<string, any> = {};
    
    // Process allowed updates
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    // Special handling for password change
    if (body.currentPassword && body.newPassword) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        body.currentPassword,
        user.password || ''
      );
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
      
      // Validate new password (at least 8 characters)
      if (body.newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }
      
      // Hash new password
      updates.password = await bcrypt.hash(body.newPassword, 10);
    }
    
    // If no updates, return early
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    
    // Apply updates to user object
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    // Return updated user (without password)
    const userObject = updatedUser.toObject();
    const { password: _, ...userWithoutPassword } = userObject;
    
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        id: userObject._id.toString(),
      },
      message: "Profile updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}