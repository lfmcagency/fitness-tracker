import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { InitDatabaseOptions, InitDatabaseResult } from './api/databaseResponses';

/**
 * Convert ID to MongoDB ObjectId
 */
export type IdConverter = (id: string | mongoose.Types.ObjectId) => mongoose.Types.ObjectId;

/**
 * Convert ObjectId to string
 */
export type StringIdConverter = (id: mongoose.Types.ObjectId | string) => string;

/**
 * ObjectId validator
 */
export type ObjectIdValidator = (id: any) => boolean;

/**
 * Database connection function
 */
export type DbConnector = () => Promise<typeof mongoose>;

/**
 * MongoDB client getter
 */
export type MongoClientGetter = () => Promise<MongoClient>;

/**
 * Database health checker
 */
export type HealthChecker = () => Promise<Record<string, any>>;

/**
 * Database disconnect function
 */
export type DbDisconnector = () => Promise<boolean>;

/**
 * Retry wrapper for database operations
 */
export type RetryWrapper = <T>(operation: () => Promise<T>, maxRetries?: number) => Promise<T>;

/**
 * Database initializer
 */
export type DatabaseInitializer = (options?: InitDatabaseOptions) => Promise<InitDatabaseResult>;

/**
 * Database seeder
 */
export type DatabaseSeeder = () => Promise<InitDatabaseResult>;

/**
 * Database clearer (development only)
 */
export type DatabaseClearer = () => Promise<InitDatabaseResult>;