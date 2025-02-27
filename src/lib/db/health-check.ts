import mongoose from 'mongoose';
import dbConnect from './mongodb';

export interface DatabaseHealthStatus {
  connected: boolean;
  state: string;
  host?: string;
  database?: string;
  models: string[];
  collections?: Record<string, number>;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<{
  success: boolean;
  status: DatabaseHealthStatus;
}> {
  try {
    await dbConnect();
    
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Get collection stats if connected
    let collections = {};
    if (connectionState === 1 && mongoose.connection.db) {
      const collectionList = await mongoose.connection.db.listCollections().toArray();
      
      // Get document counts for each collection
      for (const collection of collectionList) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        collections[collection.name] = count;
      }
    }
    
    const status: DatabaseHealthStatus = {
      connected: connectionState === 1,
      state: stateMap[connectionState as keyof typeof stateMap] || 'unknown',
      host: mongoose.connection.host,
      database: mongoose.connection.db?.databaseName,
      models: Object.keys(mongoose.models),
      collections: connectionState === 1 ? collections : undefined
    };
    
    return {
      success: status.connected,
      status
    };
  } catch (error) {
    return {
      success: false,
      status: {
        connected: false,
        state: 'error',
        models: Object.keys(mongoose.models),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

export async function getCollectionStats(): Promise<Record<string, any>> {
  try {
    await dbConnect();
    
    const stats: Record<string, any> = {};
    
    // Get stats for each model
    for (const modelName of Object.keys(mongoose.models)) {
      const model = mongoose.models[modelName];
      
      stats[modelName] = {
        count: await model.countDocuments(),
        indexes: []
      };
      
      // Get index information
      if (mongoose.connection.db) {
        const indexInfo = await mongoose.connection.db
          .collection(model.collection.name)
          .indexes();
        
        stats[modelName].indexes = indexInfo;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting collection stats:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}