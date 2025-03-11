import { NextRequest, NextResponse } from 'next/server';

// API Logger options
export interface LogOptions {
  logHeaders?: boolean;
  logBody?: boolean;
  logParams?: boolean;
  logResponse?: boolean;
  sensitiveHeaders?: string[];
  sensitiveBodyFields?: string[];
}

// Rate limiter options
export interface RateLimitOptions {
  maxRequests: number;  // Maximum requests per window
  windowMs: number;     // Time window in milliseconds
  message?: string;     // Custom rate limit message
}

// Middleware function type
export type MiddlewareFunction = (
  req: NextRequest, 
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

// Logger middleware creator
export type ApiLoggerCreator = (options?: Partial<LogOptions>) => MiddlewareFunction;

// Rate limiter middleware creator
export type RateLimiterCreator = (options?: Partial<RateLimitOptions>) => MiddlewareFunction;