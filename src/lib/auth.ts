import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-config";

// Simplified function for getting auth session
export async function getAuth() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Error getting auth session:", error);
    return null;
  }
}