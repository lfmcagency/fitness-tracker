import mongoose from 'mongoose';

// Interface for task completion log entries
export interface ITaskLog extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: 'completed' | 'uncompleted';
  completionDate: Date; // The date the task was completed/uncompleted for
  timestamp: Date; // When this log entry was created
  
  // Task state at time of action (for recovery)
  taskState: {
    name: string;
    domainCategory: string;
    labels: string[];
    recurrencePattern: string;
    customRecurrenceDays: number[];
    isSystemTask: boolean;
    currentStreak: number;
    totalCompletions: number;
  };
  
  // Event metadata
  source: 'api' | 'system' | 'migration'; // How this action was triggered
  clientInfo?: {
    userAgent?: string;
    ip?: string;
  };
  
  createdAt: Date;
}

// Interface for static methods
export interface ITaskLogStatics {
  logCompletion(
    taskId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    action: 'completed' | 'uncompleted',
    completionDate: Date,
    taskState: any,
    source?: 'api' | 'system' | 'migration'
  ): Promise<ITaskLog>;
  
  getTaskHistory(taskId: mongoose.Types.ObjectId, limit?: number): Promise<ITaskLog[]>;
  
  getUserHistory(userId: mongoose.Types.ObjectId, limit?: number): Promise<ITaskLog[]>;
  
  recoverTaskCounters(taskId: mongoose.Types.ObjectId): Promise<{
    totalCompletions: number;
    currentStreak: number;
    lastCompletedDate: Date | null;
  } | null>;
}

const TaskLogSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['completed', 'uncompleted'],
    required: true
  },
  completionDate: {
    type: Date,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  taskState: {
    name: { type: String, required: true },
    domainCategory: { type: String, required: true },
    labels: [String],
    recurrencePattern: { type: String, required: true },
    customRecurrenceDays: [Number],
    isSystemTask: { type: Boolean, default: false },
    currentStreak: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 }
  },
  source: {
    type: String,
    enum: ['api', 'system', 'migration'],
    default: 'api'
  },
  clientInfo: {
    userAgent: String,
    ip: String
  }
}, { 
  timestamps: true,
  // Auto-delete logs older than 2 years
  expireAfterSeconds: 2 * 365 * 24 * 60 * 60
});

// Static method to log a completion event
TaskLogSchema.statics.logCompletion = async function(
  taskId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  action: 'completed' | 'uncompleted',
  completionDate: Date,
  taskState: any,
  source: 'api' | 'system' | 'migration' = 'api'
): Promise<ITaskLog> {
  const logEntry = new this({
    taskId,
    userId,
    action,
    completionDate,
    taskState: {
      name: taskState.name,
      domainCategory: taskState.domainCategory,
      labels: taskState.labels || [],
      recurrencePattern: taskState.recurrencePattern,
      customRecurrenceDays: taskState.customRecurrenceDays || [],
      isSystemTask: taskState.isSystemTask || false,
      currentStreak: taskState.currentStreak || 0,
      totalCompletions: taskState.totalCompletions || 0
    },
    source
  });
  
  return await logEntry.save();
};

// Static method to get task history
TaskLogSchema.statics.getTaskHistory = async function(
  taskId: mongoose.Types.ObjectId, 
  limit: number = 100
): Promise<ITaskLog[]> {
  return await this.find({ taskId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get user history
TaskLogSchema.statics.getUserHistory = async function(
  userId: mongoose.Types.ObjectId, 
  limit: number = 100
): Promise<ITaskLog[]> {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to recover task counters from logs
TaskLogSchema.statics.recoverTaskCounters = async function(
  taskId: mongoose.Types.ObjectId
): Promise<{
  totalCompletions: number;
  currentStreak: number;
  lastCompletedDate: Date | null;
} | null> {
  try {
    // Get all completion logs for this task, sorted by completion date
    const logs = await this.find({ taskId })
      .sort({ completionDate: 1 }); // Oldest first for reconstruction
    
    if (logs.length === 0) {
      return { totalCompletions: 0, currentStreak: 0, lastCompletedDate: null };
    }
    
    // Reconstruct completion state from logs
    const completionDates = new Set<string>();
    let lastCompletedDate: Date | null = null;
    
    // Process logs chronologically to rebuild state
    for (const log of logs) {
      const dateKey = log.completionDate.toISOString().split('T')[0];
      
      if (log.action === 'completed') {
        completionDates.add(dateKey);
        if (!lastCompletedDate || log.completionDate > lastCompletedDate) {
          lastCompletedDate = log.completionDate;
        }
      } else if (log.action === 'uncompleted') {
        completionDates.delete(dateKey);
        // Recalculate last completed date
        const remainingDates = Array.from(completionDates)
          .map(dateStr => new Date(dateStr))
          .sort((a, b) => b.getTime() - a.getTime());
        lastCompletedDate = remainingDates.length > 0 ? remainingDates[0] : null;
      }
    }
    
    const totalCompletions = completionDates.size;
    
    // For streak calculation, we'd need the task's recurrence pattern
    // For now, return 0 and let the task recalculate it properly
    const currentStreak = 0;
    
    return {
      totalCompletions,
      currentStreak,
      lastCompletedDate
    };
  } catch (error) {
    console.error('Error recovering task counters:', error);
    return null;
  }
};

// Compound indexes for efficient queries
TaskLogSchema.index({ taskId: 1, timestamp: -1 });
TaskLogSchema.index({ userId: 1, timestamp: -1 });
TaskLogSchema.index({ taskId: 1, completionDate: 1 });
TaskLogSchema.index({ userId: 1, completionDate: -1 });

// Define the model interface
export interface ITaskLogModel extends mongoose.Model<ITaskLog, {}, {}>, ITaskLogStatics {}

// Export the model
export default mongoose.models.TaskLog as ITaskLogModel || 
  mongoose.model<ITaskLog, ITaskLogModel>('TaskLog', TaskLogSchema);