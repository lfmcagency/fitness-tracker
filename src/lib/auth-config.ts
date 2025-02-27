import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Always accept test credentials
        if (credentials?.email === "test@example.com" && credentials?.password === "password") {
          console.log("Using test credentials login");
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
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.sub || "1";
      }
      return session;
    },
    jwt: ({ token }) => {
      return token;
    }
  },
}