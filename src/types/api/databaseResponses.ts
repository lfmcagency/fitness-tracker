import { ApiResponse } from './common';

// Database initialization options
export interface InitDatabaseOptions {
  force?: boolean;
  seedData?: boolean;
  collections?: string[];
  skipConfirmation?: boolean;
  onProgress?: (progress: any) => void;
}

// Database initialization results
export interface InitDatabaseResult {
  success: boolean;
  message: string;
  error?: string;
  collections?: {
    initialized: number;
    skipped: number;
    errors: string[];
  };
  seedData?: {
    total: number;
    inserted: number;
    skipped: number;
    errors: string[];
  };
  collectionSummary?: any[];
}

// Database operations tracking
export interface DatabaseOperations {
  collections: {
    checked: number;
    initialized: number;
    skipped: number;
    errors: string[];
  };
  seedData: {
    totalRecords: number;
    inserted: number;
    skipped: number;
    errors: string[];
  };
  newCollections: string[];
}

// Database status response
export interface DatabaseStatusResponseData {
  connected: boolean;
  database: string | undefined;
  collections: Record<string, CollectionStats>;
  modelStats: {
    registered: number;
    models: string[];
  };
  collectionCount: number;
  collectionsError?: string;
}

export interface DatabaseInitData {
  success: boolean;
  duration: string;
  operations: DatabaseOperations;
  collections: any[];
}

// Collection statistics
export interface CollectionStats {
  count?: number;
  size?: number;
  avgObjectSize?: number;
  error?: string;
}

// Database test response
export interface DbTestResponse {
  success: boolean;
  database: {
    connected: boolean;
    readyState: number;
    host: string | null;
    name: string | null;
  };
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  error?: {
    message: string;
    details: string;
  };
}

// Database status
export interface DbStatus {
  connected: boolean;
  readyState: number;
  readyStateText: string;
  host: string | null;
  name: string | null;
  responseTime: number;
  collections: string[] | Record<string, any> | null;
  modelCount: number;
  models: string[] | null;
  collectionStats: Record<string, any> | null;
  error?: string;
}

// Response types
export type DatabaseInitResponse = ApiResponse<{
  success: boolean;
  duration: string;
  operations: DatabaseOperations;
  collections: any[];
}>;

export type DatabaseStatusResponse = ApiResponse<DatabaseStatusResponseData>;
export type DbTestAPIResponse = ApiResponse<DbTestResponse>;
export type DbStatusResponse = ApiResponse<DbStatus>;