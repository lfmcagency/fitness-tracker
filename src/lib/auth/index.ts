// src/lib/auth/index.ts
import mongoose from 'mongoose';
import { getServerSession, type NextAuthOptions, type Session, type User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/db"; // Your MongoDB client promise setup
import { dbConnect } from '@/lib/db';
import User from "@/models/User"; // Adjust path if needed
import { IUser } from '@/types/models/user'; // Adjust path if needed
import { SessionUser } from "@/types/api/authResponses"; // Your custom session user type
import bcrypt from 'bcrypt'; // Keep bcrypt for comparison if not using model method

// --- NextAuth Configuration Options ---
export const authOptions: NextAuthOptions = {
  // Use MongoDB Adapter for session persistence, account linking, etc.
  adapter: MongoDBAdapter(clientPromise),

  // Define Authentication Providers
  providers: [
    CredentialsProvider({
      name: "Credentials", // Name shown on the sign-in form
      credentials: {
        // Define fields expected from the login form
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        const logPrefix = "🔑 [AUTH_AUTHORIZE]";
        console.log(`${logPrefix} Starting authorization.`);

        // --- Optional: Development Test User ---
        if (process.env.NODE_ENV === 'development' && credentials?.email === 'test@example.com') {
          if (credentials.password === 'password') {
            console.log(`${logPrefix} Development test user authenticated.`);
            // Return an object matching NextAuth's expected User type + your custom fields
            return { id: "dev-user-id", name: "Test Dev User", email: "test@example.com", role: "admin" } as NextAuthUser & { role: string };
          } else {
            console.log(`${logPrefix} Development test user authentication FAILED (wrong password).`);
            return null;
          }
        }
        // --- End Optional ---

        // Validate credentials input
        if (!credentials?.email || !credentials?.password) {
          console.log(`${logPrefix} Missing email or password.`);
          return null; // Return null if credentials are missing
        }

        try {
          await dbConnect(); // Ensure database connection
          console.log(`${logPrefix} Database connected. Looking up user: ${credentials.email}`);

          // Find user by email (ensure password field is selected if schema hides it)
          const user = await User.findOne<IUser>({ email: credentials.email.toLowerCase() })
                                //.select('+password'); // Uncomment if password has `select: false` in UserSchema

          if (!user) {
            console.log(`${logPrefix} User not found: ${credentials.email}`);
            return null; // User not found
          }

          if (!user.password) {
            console.log(`${logPrefix} User ${credentials.email} found but has no password set.`);
            return null; // User found but no password (e.g., OAuth user trying credentials)
          }

          // Compare the provided password with the stored hash
          console.log(`${logPrefix} User found. Comparing password for: ${credentials.email}`);
          const isPasswordValid = await user.comparePassword(credentials.password);

          // --- Alternative: Direct bcrypt compare ---
          // const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          // -----------------------------------------

          if (!isPasswordValid) {
            console.log(`${logPrefix} Invalid password for user: ${credentials.email}`);
            return null; // Password mismatch
          }

          // Authentication successful!
          console.log(`✅ ${logPrefix} Authentication successful for: ${credentials.email}`);

          // Return the user object needed by NextAuth for session/token population
          // Must include at least 'id', 'email'. Add other fields needed in token/session.
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name, // Optional: pass name
            image: user.image, // Optional: pass image
            role: user.role || 'user' // Pass role or default
          } as NextAuthUser & { role?: string }; // Assert type for custom fields

        } catch (error) {
          console.error(`❌ ${logPrefix} Error during authorization:`, error);
          return null; // Return null on any error during the process
        }
      }
    }),
    // Add other providers here (e.g., GoogleProvider, GithubProvider) if needed
  ],

  // Session Configuration
  session: {
    strategy: "jwt", // Use JSON Web Tokens for session management
    maxAge: 30 * 24 * 60 * 60, // Session expiry: 30 days
    // updateAge: 24 * 60 * 60, // Optional: How often to update the session database entry (24 hours)
  },

  // JWT Configuration
  jwt: {
    // secret: process.env.NEXTAUTH_SECRET, // Deprecated - use top-level secret
    // maxAge: 60 * 60 * 24 * 30, // Optional: Can be set here too
  },

  // Specify Custom Pages
  pages: {
    signIn: '/auth/signin', // Redirect users to this page for sign-in
    // signOut: '/auth/signout', // Optional: Custom sign-out page
    // error: '/auth/error', // Optional: Error page (e.g., for auth errors)
    // verifyRequest: '/auth/verify-request', // Optional: Email verification page
    // newUser: '/auth/new-user' // Optional: Page for first-time OAuth users
  },

  // Callbacks for customizing behavior
  callbacks: {
    /**
     * Called when a JWT is created (on sign in) or updated (session accessed).
     * The returned value will be encrypted and stored in a cookie.
     */
    async jwt({ token, user, account, profile, isNewUser }) {
      const logPrefix = "🔑 [AUTH_JWT_CALLBACK]";
      // `user` object is available on initial sign-in
      if (user) {
         console.log(`${logPrefix} JWT callback triggered on sign-in for user: ${user.email}`);
        // Persist the necessary user fields from the 'user' object (returned by authorize) into the token
        token.id = user.id;
        token.email = user.email; // Email should already be in token, but good to be explicit
        // Add custom properties like 'role' to the token
        // Ensure the 'user' object passed here actually has the 'role' property
        token.role = (user as any).role || 'user'; // Use type assertion or check existence
        console.log(`${logPrefix} Added id (${token.id}) and role (${token.role}) to JWT.`);
      } else {
        // console.log(`${logPrefix} JWT callback triggered for existing session.`);
      }
      return token; // The token is now { id, email, role, iat, exp, jti, ... }
    },

    /**
     * Called whenever a session is checked (e.g., via useSession, getSession).
     * The returned value is passed to the client.
     */
    async session({ session, token, user }) {
       const logPrefix = "🔑 [AUTH_SESSION_CALLBACK]";
      // `token` contains the data persisted in the JWT callback
      // `user` object might be available depending on adapter/strategy? Usually rely on token.
      if (session.user && token.id) {
        // Add the properties from the token (like id and role) to the session.user object
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        // console.log(`${logPrefix} Added id (${session.user.id}) and role (${session.user.role}) to session object.`);
      } else {
        // console.log(`${logPrefix} Session callback triggered, but no token ID found or session.user missing.`);
      }
      return session; // The session object now includes { user: { id, name, email, image, role }, expires }
    },
  },

  // Secret for signing/encrypting tokens and cookies
  // Ensure this is set in your .env.local file
  secret: process.env.NEXTAUTH_SECRET,

  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",

  // Optional: Custom logger for more control
  logger: {
    error(code, metadata) {
       console.error(`❌ [NextAuth Error] Code: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`⚠️ [NextAuth Warn] Code: ${code}`);
    },
    // debug(code, metadata) {
    //   console.log(`⚙️ [NextAuth Debug] Code: ${code}`, metadata);
    // },
  },

  // Optional: Event listeners
  events: {
    async signIn(message) { /* User signed in */ console.log("✅ NextAuth Event: signIn", message.user.email); },
    async signOut(message) { /* User signed out */ console.log("👋 NextAuth Event: signOut", message.session.user?.email); },
    // async createUser(message) { /* User created */ },
    // async updateUser(message) { /* User updated - e.g., profile */ },
    // async linkAccount(message) { /* Account (e.g., OAuth) linked */ },
    // async session(message) { /* Session active */ },
  },
};

/**
 * Helper function to get the server-side session.
 * Use this in API routes or server components.
 * @returns The session object or null if not authenticated.
 */
export const getAuth = async (): Promise<Session | null> => {
  // Ensure authOptions are passed correctly
  return await getServerSession(authOptions);
};

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  image?: string;
}) {
  const logPrefix = "🔑 [REGISTER_USER]";
  
  try {
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create new user
    const user = await User.create({
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      image: userData.image,
      role: 'user'
    });

    // Return user without password
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image
    };

  } catch (error) {
    console.error(`${logPrefix} Error registering user:`, error);
    throw error;
  }
}

/**
 * Fetches user details by ID from the database.
 * Excludes the password field.
 * Use this when you need more user details than available in the session.
 * @param id - The user's MongoDB ObjectId as a string.
 * @returns The user object (without password) or null if not found.
 */
export async function getUserById(id: string) {
  const logPrefix = "🔑 [GET_USER_BY_ID]";
  if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`${logPrefix} Invalid user ID format: ${id}`);
      return null;
  }

  try {
    await dbConnect();
    // Find user by ID, explicitly excluding the password
    const user = await User.findById(id).select('-password').lean() as Omit<IUser, 'password' | 'comparePassword'> | null;

    if (!user) {
      console.log(`${logPrefix} User not found for ID: ${id}`);
      return null;
    }

    // Transform _id to id if using lean()
    return {
        ...user,
        id: user._id.toString(),
    };

  } catch (error) {
    console.error(`${logPrefix} Error fetching user by ID ${id}:`, error);
    return null;
  }
}