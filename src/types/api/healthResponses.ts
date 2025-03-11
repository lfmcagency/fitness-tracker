import { ApiResponse } from './common';

// Health status types
export type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';

// Base component health
export interface ComponentHealth {
  status: HealthStatus;
  message: string;
}

// Database component health
export interface DatabaseHealth extends ComponentHealth {
  details?: {
    host?: string;
    readyState?: number;
    name?: string;
    collections?: number;
    error?: string;
  };
}

// Memory component health
export interface MemoryHealth extends ComponentHealth {
  total: number; // MB
  free: number;  // MB
  usage: number; // Percentage
}

// Environment component health
export interface EnvironmentHealth extends ComponentHealth {
  nodeVersion: string;
  platform: string;
  arch: string;
  env: string | undefined;
}

// System health response structure
export interface SystemHealth {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  responseTime?: number;
  components: {
    server: ComponentHealth;
    database: DatabaseHealth;
    memory: MemoryHealth;
    environment?: EnvironmentHealth;
  };
}

// Response type
export type HealthCheckResponse = ApiResponse<SystemHealth>;