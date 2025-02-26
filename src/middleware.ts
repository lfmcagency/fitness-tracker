// src/middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect these routes that require authentication
    "/dashboard",
    "/training",
    "/nutrition",
    "/routine"
  ],
};