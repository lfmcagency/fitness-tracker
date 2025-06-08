// src/lib/auth/index.ts
import mongoose from 'mongoose';
import { getServerSession, type NextAuthOptions, type Session, type User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { IUser } from '@/types/models/user';

// NextAuth Configuration
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        const logPrefix = "🔑 [AUTH_AUTHORIZE]";
        console.log(`${logPrefix} Starting authorization.`);

        // Dev test user
        if (process.env.NODE_ENV === 'development' && credentials?.email === 'test@example.com') {
          if (credentials.password === 'password') {
            console.log(`${logPrefix} Development test user authenticated.`);
            return { 
              id: "dev-user-id", 
              name: "Test Dev User", 
              email: "test@example.com", 
              role: "admin" 
            } as NextAuthUser & { role: string };
          } else {
            console.log(`${logPrefix} Development test user authentication FAILED.`);
            return null;
          }
        }

        if (!credentials?.email || !credentials?.password) {
          console.log(`${logPrefix} Missing email or password.`);
          return null;
        }

        try {
          await dbConnect();
          console.log(`${logPrefix} Database connected. Looking up user: ${credentials.email}`);

          const user = await User.findOne<IUser>({ email: credentials.email.toLowerCase() });

          if (!user) {
            console.log(`${logPrefix} User not found: ${credentials.email}`);
            return null;
          }

          if (!user.password) {
            console.log(`${logPrefix} User ${credentials.email} found but has no password set.`);
            return null;
          }

          console.log(`${logPrefix} User found. Comparing password for: ${credentials.email}`);
          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            console.log(`${logPrefix} Invalid password for user: ${credentials.email}`);
            return null;
          }

          console.log(`✅ ${logPrefix} Authentication successful for: ${credentials.email}`);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role || 'user'
          } as NextAuthUser & { role?: string };

        } catch (error) {
          console.error(`❌ ${logPrefix} Error during authorization:`, error);
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
    signIn: '/auth/signin',
  },

  callbacks: {
    async jwt({ token, user }) {
      const logPrefix = "🔑 [AUTH_JWT_CALLBACK]";
      if (user) {
        console.log(`${logPrefix} JWT callback triggered on sign-in for user: ${user.email}`);
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role || 'user';
        console.log(`${logPrefix} Added id (${token.id}) and role (${token.role}) to JWT.`);
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  logger: {
    error(code, metadata) {
      console.error(`❌ [NextAuth Error] Code: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`⚠️ [NextAuth Warn] Code: ${code}`);
    },
  },

  events: {
    async signIn(message) { 
      console.log("✅ NextAuth Event: signIn", message.user.email); 
    },
    async signOut(message) { 
      console.log("👋 NextAuth Event: signOut", message.session.user?.email); 
    },
  },
};

// Get server session
export const getAuth = async (): Promise<Session | null> => {
  return await getServerSession(authOptions);
};

// Register new user
export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  image?: string;
}) {
  const logPrefix = "🔑 [REGISTER_USER]";
  console.log(`${logPrefix} Starting user registration process for: ${userData.email}`);
  
  try {
    await dbConnect();
    console.log(`${logPrefix} Database connection established.`);

    // Check if user exists
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      console.log(`${logPrefix} User already exists: ${userData.email}`);
      throw new Error('User already exists');
    }

    // First user gets admin role
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';
    console.log(`${logPrefix} Assigning role: ${role}. Is first user: ${userCount === 0}`);

    // Create user (let pre-save hook handle password hashing)
    console.log(`${logPrefix} Creating user document in database (password will be hashed by pre-save hook).`);
    const user = await User.create({
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: userData.password, // Raw password - model will hash it
      image: userData.image,
      role: role
    });

    console.log(`✅ ${logPrefix} User created successfully with ID: ${user._id}`);

    // Return user data without password
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      settings: user.settings
    };

  } catch (error) {
    console.error(`❌ ${logPrefix} Error registering user:`, error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(id: string) {
  const logPrefix = "🔑 [GET_USER_BY_ID]";
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.error(`${logPrefix} Invalid user ID format: ${id}`);
    return null;
  }

  try {
    await dbConnect();
    const user = await User.findById(id).select('-password').lean() as Omit<IUser, 'password' | 'comparePassword'> | null;

    if (!user) {
      console.log(`${logPrefix} User not found for ID: ${id}`);
      return null;
    }

    return {
      ...user,
      id: user._id.toString(),
    };

  } catch (error) {
    console.error(`${logPrefix} Error fetching user by ID ${id}:`, error);
    return null;
  }
}