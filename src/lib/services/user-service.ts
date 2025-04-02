// src/lib/services/user-service.ts
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { dbConnect } from '@/lib/db';
import User from '@/models/User'; // Adjust path if your models folder is elsewhere
import { IUser } from '@/types/models/user'; // Adjust path as needed
import { ErrorCode } from '@/types/validation'; // Adjust path as needed

// Define the input data structure for registration
export interface UserRegistrationData {
  name: string;
  email: string;
  password: string; // Plain text password
  image?: string;
  role?: string; // Optional role assignment
}

// Define the structure of the returned user object (excluding password)
// You might want to consolidate this with your UserProfile type later
type RegisteredUser = {
  settings: { weightUnit: "kg"; };
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  bodyweight?: Array<{ weight: number; date: Date; notes?: string }>;
};

/**
 * Registers a new user in the database.
 * Handles password hashing via the User model's pre-save hook.
 * @param userData - The user data for registration.
 * @returns The newly created user object (without password).
 * @throws Throws an error if registration fails (e.g., user exists).
 */
export async function registerUser(userData: UserRegistrationData): Promise<RegisteredUser> {
  const logPrefix = "🔑 [REGISTER_USER]";
  console.log(`${logPrefix} Starting user registration process for: ${userData.email}`);

  try {
    await dbConnect();
    console.log(`${logPrefix} Database connection established.`);

    // 1. Check if user already exists (case-insensitive email check)
    const existingUser = await User.findOne({ email: new RegExp(`^${userData.email}$`, 'i') });
    if (existingUser) {
      console.log(`${logPrefix} User with email ${userData.email} already exists.`);
      // Use a specific error type or code if desired
      const error = new Error("User already exists");
      (error as any).code = ErrorCode.DUPLICATE; // Attach error code if using custom error handling
      throw error;
    }

    // 2. Determine user role (first user becomes admin)
    const userCount = await User.countDocuments({});
    const isFirstUser = userCount === 0;
    const role = isFirstUser ? 'admin' : (userData.role || 'user');
    console.log(`${logPrefix} Assigning role: ${role}. Is first user: ${isFirstUser}`);

    // 3. Create the new user document
    // The plain text password will be hashed by the pre-save hook in User.ts
    console.log(`${logPrefix} Creating user document in database (password will be hashed by pre-save hook).`);
    const newUser = new User({
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      password: userData.password, // Pass the plain text password
      image: userData.image || null,
      role: role,
      settings: { weightUnit: 'kg' },
    });

    // 4. Save the user (triggers the pre-save hook)
    const savedUser = await newUser.save();
    console.log(`✅ ${logPrefix} User registered successfully: ${savedUser.email} (ID: ${savedUser._id})`);

    // 5. Return user data (excluding password)
    // Use toObject() to get a plain JS object if needed, or directly access properties
    const userObject = savedUser.toObject();
    // Destructure to remove password and methods before returning
    const { password: _, comparePassword, ...userWithoutPassword } = userObject;

    return {
      ...userWithoutPassword,
      id: userObject._id.toString(), // Ensure ID is returned as a string
      settings: { weightUnit: 'kg' } // Ensure settings match the expected type
    };

  } catch (error: any) {
    console.error(`❌ ${logPrefix} Error during user registration:`, error);
    // Re-throw the error to be handled by the calling API route
    // Include error code if available
    if (error.code === 11000) { // MongoDB duplicate key error
        const duplicateError = new Error("Email is already registered");
       (duplicateError as any).code = ErrorCode.DUPLICATE;
        throw duplicateError;
    }
    throw error;
  }
}