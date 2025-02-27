import mongoose from 'mongoose';
import dbConnect from './mongodb';

export async function checkDatabaseHealth() {
  try {
    await dbConnect();
    
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      4: 'invalid'
    };
    
    const status = {
      connected: connectionState === 1,
      state: stateMap[connectionState as keyof typeof stateMap] || 'unknown',
      host: mongoose.connection.host,
      database: mongoose.connection.db?.databaseName || 'none',
      models: Object.keys(mongoose.models)
    };
    
    return {
      success: status.connected,
      status
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
  }
}