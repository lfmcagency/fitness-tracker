import { NextRequest, NextResponse } from 'next/server';

/**
 * Log format options
 */
interface LogOptions {
  logHeaders?: boolean;
  logBody?: boolean;
  logParams?: boolean;
  logResponse?: boolean;
  sensitiveHeaders?: string[];
  sensitiveBodyFields?: string[];
}

const DEFAULT_OPTIONS: LogOptions = {
  logHeaders: true,
  logBody: true,
  logParams: true,
  logResponse: true,
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
  sensitiveBodyFields: ['password', 'token', 'secret', 'key', 'credit_card']
};

/**
 * API logging middleware
 * @param options Logging options
 * @returns Middleware function
 */
export function apiLogger(options: Partial<LogOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async function(req: NextRequest, next: () => Promise<NextResponse>) {
    const startTime = Date.now();
    const method = req.method;
    const url = req.url;
    const id = Math.random().toString(36).substring(2, 10);
    
    // Log request
    console.log(`[${id}] 📥 ${method} ${url}`);
    
    // Log headers if enabled
    if (config.logHeaders) {
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        if (config.sensitiveHeaders?.includes(key.toLowerCase())) {
          headers[key] = '[REDACTED]';
        } else {
          headers[key] = value;
        }
      });
      console.log(`[${id}] 🔶 Headers:`, headers);
    }
    
    // Log query parameters if enabled
    if (config.logParams) {
      const params: Record<string, string> = {};
      const urlObj = new URL(url);
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      console.log(`[${id}] 🔍 Params:`, params);
    }
    
    // Log request body if enabled
    if (config.logBody && method !== 'GET' && method !== 'HEAD') {
      try {
        // Clone the request to avoid consuming the body
        const clone = req.clone();
        const body = await clone.json();
        
        // Redact sensitive fields
        const safeBody = { ...body };
        
        if (config.sensitiveBodyFields) {
          for (const field of config.sensitiveBodyFields) {
            if (field in safeBody) {
              safeBody[field] = '[REDACTED]';
            }
          }
        }
        
        console.log(`[${id}] 📦 Body:`, safeBody);
      } catch (error) {
        console.log(`[${id}] 📦 Body: [Could not parse]`);
      }
    }
    
    // Process the request
    let response: NextResponse;
    try {
      response = await next();
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${id}] ❌ Error (${duration}ms):`, error);
      throw error;
    }
    
    // Log response
    const duration = Date.now() - startTime;
    const status = response.status;
    
    console.log(`[${id}] 📤 ${method} ${url} - ${status} (${duration}ms)`);
    
    // Log response body if enabled
    if (config.logResponse) {
      try {
        // Clone the response to avoid consuming the body
        const clone = response.clone();
        const body = await clone.json();
        console.log(`[${id}] 📄 Response:`, body);
      } catch (error) {
        console.log(`[${id}] 📄 Response: [Could not parse]`);
      }
    }
    
    return response;
  };
}