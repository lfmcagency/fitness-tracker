import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/mongodb-adapter";
import { dbConnect } from '@/lib/db/mongodb';
import User from "@/models/User";
import { compare, hash } from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

export interface UserRegistrationData {
  name: string;
  email: string;
  password: string;
  image?: string;
  role?: string;
}

/**
 * Register a new user with email and password
 */
export async function registerUser(userData: UserRegistrationData) {
  await dbConnect();
  
  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error("User already exists");
  }
  
  // Hash password manually instead of relying on the pre-save hook
  const hashedPassword = await hash(userData.password, 10);
  
  // Determine if this is the first user (admin)
  const userCount = await User.countDocuments({});
  const isFirstUser = userCount === 0;
  
  // Create new user
  const user = await User.create({
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    image: userData.image || null,
    role: isFirstUser ? 'admin' : (userData.role || 'user')
  });
  
  // Return user without password
  const userObject = user.toObject();
  const { password: _, ...userWithoutPassword } = userObject;
  
  return {
    ...userWithoutPassword,
    id: userObject._id.toString(),
  };
}

/**
 * Check if a user has required role
 */
export async function checkUserRole(userId: string, requiredRoles: string[]): Promise<boolean> {
  try {
    await dbConnect();
    const user = await User.findById(userId);
    
    if (!user) return false;
    
    // If the user has any of the required roles
    return requiredRoles.includes(user.role || 'user');
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Middleware to protect routes based on roles
 */
export function withRoleProtection(requiredRoles: string[] = ['admin']) {
  return async (req: NextRequest, handler: Function) => {
    const session = await getAuth();
    
    // No session or no user ID
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user has required role
    const hasRole = await checkUserRole(session.user.id, requiredRoles);
    if (!hasRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // User has required role, proceed to handler
    return handler(req, session);
  };
}

export const authOptions: NextAuthOptions = {
  // Use TypeScript type assertion to avoid the 'any' type issue
  adapter: MongoDBAdapter(clientPromise as any),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // For development - accept test user credentials
        if (credentials?.email === "test@example.com" && credentials?.password === "password") {
          return {
            id: "1",
            name: "Test User",
            email: "test@example.com",
            role: "admin" // Set test user as admin for development
          };
        }
        
        try {
          await dbConnect();
          
          if (!credentials?.email || !credentials?.password) {
            return null;
          }
          
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            return null;
          }
          
          // If user exists but doesn't have a password (like our test user)
          if (!user.password) {
            return null;
          }
          
          console.log("Attempting login for:", credentials.email);
          console.log("Password from credentials:", credentials.password.substring(0, 3) + "***");
          console.log("Stored password hash (first 20 chars):", user.password.substring(0, 20) + "...");
          
          // Try both ways of comparing passwords
          let isPasswordValid = false;
          
          // 1. Using direct bcrypt comparison
          try {
            isPasswordValid = await compare(credentials.password, user.password);
            console.log("Direct bcrypt compare result:", isPasswordValid);
          } catch (err) {
            console.error("Error in direct password comparison:", err);
          }
          
          // 2. Using the model method if direct comparison fails
          if (!isPasswordValid && typeof user.comparePassword === 'function') {
            try {
              isPasswordValid = await user.comparePassword(credentials.password);
              console.log("Model comparePassword result:", isPasswordValid);
            } catch (err) {
              console.error("Error in model comparePassword:", err);
            }
          }
          
          if (!isPasswordValid) {
            console.log("Password validation failed");
            return null;
          }
          
          console.log("Login successful for:", credentials.email);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || "User",
            image: user.image || null,
            role: user.role || 'user'
          };
        } catch (error) {
          console.error("Error in authorize function:", error);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key",
  debug: process.env.NODE_ENV === "development",
};

export const getAuth = () => getServerSession(authOptions);

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  await dbConnect();
  
  const user = await User.findById(id);
  if (!user) {
    return null;
  }
  
  // Return user without password
  const userObject = user.toObject();
  const { password: _, ...userWithoutPassword } = userObject;
  
  return {
    ...userWithoutPassword,
    id: userObject._id.toString(),
  };
}