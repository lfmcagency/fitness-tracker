import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Always allow test credentials in any environment
        if (credentials?.email === "test@example.com" && credentials?.password === "password") {
          console.log("Logging in with test credentials");
          return {
            id: "1",
            name: "Test User",
            email: "test@example.com"
          };
        }
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
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key",
  callbacks: {
    // Ensure user ID is included in session
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "1";
      }
      return session;
    }
  }
};

// Simplified function for getting auth session
export async function getAuth() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Error getting auth session:", error);
    return null;
  }
}