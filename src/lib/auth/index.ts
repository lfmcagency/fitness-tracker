import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/mongodb-adapter";
import { dbConnect } from '@/lib/db/mongodb';
import User from "@/models/User";
import { compare } from "bcrypt";

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
            email: "test@example.com"
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
          
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            return null;
          }
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || "User"
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
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const getAuth = () => getServerSession(authOptions);