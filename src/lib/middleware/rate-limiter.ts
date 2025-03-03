import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '../api-utils';

// In-memory storage for rate limiting
// In production, use Redis or another distributed cache instead
const ipRequestCounts: Record<string, { count: number, reset: number }> = {};

interface RateLimitOptions {
  maxRequests: number;  // Maximum requests per window
  windowMs: number;     // Time window in milliseconds
  message?: string;     // Custom rate limit message
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  maxRequests: 60,      // 60 requests per minute
  windowMs: 60 * 1000,  // 1 minute window
  message: 'Too many requests, please try again later'
};

/**
 * Rate limiter middleware for API routes
 * @param options Rate limiting options
 * @returns Middleware function
 */
export function rateLimiter(options: Partial<RateLimitOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async function(req: NextRequest, next: () => Promise<NextResponse>) {
    // Skip rate limiting in development environment
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Get IP address from headers or connection
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    
    // Initialize or get current count for this IP
    if (!ipRequestCounts[ip] || ipRequestCounts[ip].reset < now) {
      ipRequestCounts[ip] = {
        count: 0,
        reset: now + config.windowMs
      };
    }
    
    // Increment request count
    ipRequestCounts[ip].count++;
    
    // Get remaining requests
    const requestsRemaining = Math.max(0, config.maxRequests - ipRequestCounts[ip].count);
    
    // Set rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', requestsRemaining.toString());
    headers.set('X-RateLimit-Reset', ipRequestCounts[ip].reset.toString());
    
    // If exceeded limit, return rate limit error
    if (ipRequestCounts[ip].count > config.maxRequests) {
      const resetInSeconds = Math.ceil((ipRequestCounts[ip].reset - now) / 1000);
      headers.set('Retry-After', resetInSeconds.toString());
      
      return apiError(
        config.message || 'Too many requests, please try again later',  // Ensure a non-optional string
        429,
        'ERR_RATE_LIMIT', 
        { retryAfter: resetInSeconds }
      );
    }
    
    // Process the request
    const response = await next();
    
    // Add rate limit headers to response
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }
    
    return response;
  };
}