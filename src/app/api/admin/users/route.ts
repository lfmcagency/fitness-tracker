import { NextRequest, NextResponse } from "next/server";
import { withRoleProtection } from "@/lib/auth";
import { dbConnect } from '@/lib/db/mongodb';
import User from "@/models/User";

// GET: List all users (admin only)
export async function GET(req: NextRequest) {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      await dbConnect();
      
      // Get users (excluding password field)
      const users = await User.find({}).select('-password');
      
      // Map the users to add id field and transform _id
      const formattedUsers = users.map(user => {
        const userObj = user.toObject();
        return {
          ...userObj,
          id: userObj._id.toString(),
          _id: undefined
        };
      });
      
      return NextResponse.json(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  });
}

// POST: Update user role (admin only)
export async function POST(req: NextRequest) {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      const body = await req.json();
      const { userId, role } = body;
      
      if (!userId || !role) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }
      
      // Validate role
      if (!['user', 'admin', 'trainer'].includes(role)) {
        return NextResponse.json(
          { error: "Invalid role. Allowed roles: user, admin, trainer" },
          { status: 400 }
        );
      }
      
      await dbConnect();
      
      // Update user role
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      const userObj = updatedUser.toObject();
      
      return NextResponse.json({
        user: {
          ...userObj,
          id: userObj._id.toString(),
          _id: undefined
        },
        message: `User role updated to ${role}`
      });
      
    } catch (error) {
      console.error("Error updating user role:", error);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }
  });
}