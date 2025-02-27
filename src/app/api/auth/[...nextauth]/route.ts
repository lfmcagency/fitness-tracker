export const dynamic = 'force-dynamic'
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
        // Always accept test credentials regardless of DB status
        if (credentials?.email === "test@example.com" && credentials?.password === "password") {
          console.log("Using test credentials login");
          return {
            id: "1",
            name: "Test User",
            email: "test@example.com"
          };
        }
        
        // In a production app, you'd validate against DB records here
        // But for now, we'll only accept the test user
        return null;
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
  // Ensure secret is set - this is critical for JWT signing
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key",
  // Debug mode in development only
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    // Add user ID to the session
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.sub || "1";
      }
      return session;
    },
    // You can customize JWT creation here if needed
    jwt: ({ token }) => {
      return token;
    }
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };