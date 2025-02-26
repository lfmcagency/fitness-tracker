import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // For development purposes, accept a hardcoded test user
        if (credentials?.email === "test@example.com" && credentials?.password === "password") {
          return {
            id: "1",
            name: "Test User",
            email: "test@example.com"
          };
        }
        
        // Any other credentials will fail
        return null;
      }
    }),
  ],
  session: {
    strategy: "jwt" as const, // Use 'as const' to ensure correct type
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };