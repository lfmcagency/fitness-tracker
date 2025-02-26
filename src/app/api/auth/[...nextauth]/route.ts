// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/db/mongodb-adapter';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import { compare } from 'bcrypt';

const handler = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await dbConnect();
        
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await User.findOne({ email: credentials.email });
        
        if (!user) {
          return null;
        }
        
        const isPasswordValid = await compare(credentials.password, user.password);
        
        if (!isPasswordValid) {
          return null;
        }
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name
        };
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };