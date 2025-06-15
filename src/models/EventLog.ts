// src/models/EventLog.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { RichProgressContract, ReversalData, RichEventContext, TaskUpdateRequest, AchievementThreshold } from '@/lib/event-coordinator/types';

/**
 * Event log status enumeration
 */
export enum EventLogStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed'
}

/**
 * Event log document interface
 */
export interface IEventLog extends Document {
  /** Unique token for fast lookup */
  token: string;
  
  /** User who initiated the event */
  userId: mongoose.Types.ObjectId;
  
  /** Complete rich progress contract */
  contractData: RichProgressContract;
  
  /** Complete reversal data with undo instructions */
  reversalData: ReversalData;
  
  /** Current status of the event */
  status: EventLogStatus;
  
  /** When the event was processed */
  timestamp: Date;
  
  /** Optional error message if failed */
  errorMessage?: string;
  
  /** Performance metrics */
  performance?: {
    totalDuration: number;
    xpCalculationTime: number;
    taskUpdateTime: number;
    achievementTime: number;
    reversalBuildTime: number;
  };
  
  /** When this was reversed (if applicable) */
  reversedAt?: Date;
  
  /** Token of the reverse operation (if applicable) */
  reversedByToken?: string;
  
  // Instance methods
  markAsReversed(reverseToken: string): Promise<void>;
  isReversible(): boolean;
  getReversalInstructions(): ReversalData['undoInstructions'];
}

// Rich Event Context Schema
const RichEventContextSchema = new Schema({
  streakCount: { type: Number, required: true },
  totalCompletions: { type: Number, required: true },
  itemName: { type: String, required: true },
  domainCategory: { type: String, enum: ['ethos', 'trophe', 'soma'] },
  labels: [{ type: String }],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  isSystemItem: { type: Boolean, default: false },
  milestoneHit: { type: String },
  milestoneValue: { type: Number },
  
  // Domain-specific contexts (all optional)
  nutritionContext: {
    dailyMacroProgress: {
      protein: Number,
      carbs: Number,
      fat: Number,
      calories: Number,
      total: Number
    },
    totalMeals: Number,
    mealCount: Number,
    macroTotals: {
      protein: Number,
      carbs: Number,
      fat: Number,
      calories: Number
    }
  },
  
  taskContext: {
    taskName: String,
    bestStreak: Number,
    domainTasksTotal: Number,
    domainTasksCompleted: Number,
    previousStreak: Number,
    previousTotalCompletions: Number
  },
  
  workoutContext: {
    exerciseCount: Number,
    totalSets: Number,
    workoutDuration: Number,
    bodyweight: Number,
    categories: [String],
    totalWorkouts: Number
  }
}, { _id: false });

// Task Update Request Schema
const TaskUpdateRequestSchema = new Schema({
  taskId: String,
  domainCategory: { type: String, enum: ['ethos', 'trophe', 'soma'] },
  labels: [String],
  action: { 
    type: String, 
    enum: ['create', 'update', 'complete', 'uncomplete'],
    required: true 
  },
  taskData: {
    name: String,
    description: String,
    progress: Number,
    completed: Boolean,
    completionDate: String,
    scheduledTime: String,
    category: String,
    priority: { type: String, enum: ['low', 'medium', 'high'] }
  },
  source: { type: String, required: true },
  token: { type: String, required: true }
}, { _id: false });

// Achievement Threshold Schema
const AchievementThresholdSchema = new Schema({
  achievementId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['streak', 'total', 'milestone', 'cross_domain'],
    required: true 
  },
  threshold: { type: Number, required: true },
  currentValue: { type: Number, required: true },
  justCrossed: { type: Boolean, required: true },
  bonusXp: Number
}, { _id: false });

// Rich Progress Contract Schema
const RichProgressContractSchema = new Schema({
  token: { type: String, required: true },
  eventId: { type: Number, required: true },
  source: { type: String, required: true },
  action: { type: String, required: true },
  userId: { type: String, required: true },
  
  context: { type: RichEventContextSchema, required: true },
  taskUpdates: [TaskUpdateRequestSchema],
  achievementThresholds: [AchievementThresholdSchema],
  
  xpMetadata: {
    baseXp: { type: Number, required: true },
    streakMultiplier: { type: Number, required: true },
    milestoneBonus: { type: Number, required: true },
    difficultyMultiplier: { type: Number, required: true },
    categoryBonus: { type: Number, required: true }
  },
  
  reversalData: {
    undoInstructions: {
      subtractXp: Number,
      lockAchievements: [String],
      revertLevel: Number,
      undoTaskUpdates: [{
        taskId: { type: String, required: true },
        revertTo: { type: Schema.Types.Mixed, required: true }
      }],
      domainSpecific: { type: Schema.Types.Mixed }
    },
    snapshotData: {
      userStateBeforeEvent: { type: Schema.Types.Mixed },
      eventContext: RichEventContextSchema,
      crossDomainUpdates: [TaskUpdateRequestSchema]
    }
  }
}, { _id: false });

// Reversal Data Schema (matches ReversalData type exactly)
const ReversalDataSchema = new Schema({
  token: { type: String, required: true },
  
  undoInstructions: {
    subtractXp: Number,
    lockAchievements: [String],
    revertLevel: Number,
    undoTaskUpdates: [{
      taskId: { type: String, required: true },
      revertTo: { type: Schema.Types.Mixed, required: true }
    }],
    domainSpecific: { type: Schema.Types.Mixed }
  },
  
  previousUserState: {
    level: Number,
    totalXp: Number,
    categoryProgress: { type: Schema.Types.Mixed },
    achievements: [String]
  },
  
  finalUserState: {
    level: Number,
    totalXp: Number,
    categoryProgress: { type: Schema.Types.Mixed },
    achievements: [String]
  }
}, { _id: false });

// Performance Schema
const PerformanceSchema = new Schema({
  totalDuration: { type: Number, required: true },
  xpCalculationTime: { type: Number, required: true },
  taskUpdateTime: { type: Number, required: true },
  achievementTime: { type: Number, required: true },
  reversalBuildTime: { type: Number, required: true }
}, { _id: false });

// Main Event Log Schema
const EventLogSchema = new Schema<IEventLog>({
  token: { 
    type: String, 
    required: true, 
    unique: true,
    index: true  // Fast lookup by token
  },
  
  userId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'User',
    index: true  // Fast lookup by user
  },
  
  contractData: { 
    type: RichProgressContractSchema, 
    required: true 
  },
  
  reversalData: { 
    type: ReversalDataSchema, 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: Object.values(EventLogStatus),
    required: true,
    default: EventLogStatus.COMPLETED,
    index: true  // Fast lookup by status
  },
  
  timestamp: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true  // Fast lookup by time
  },
  
  errorMessage: { 
    type: String,
    maxlength: 1000
  },
  
  performance: PerformanceSchema,
  
  reversedAt: { 
    type: Date,
    index: true  // Fast lookup for reversed events
  },
  
  reversedByToken: { 
    type: String,
    index: true  // Link reverse operations
  }
}, { 
  timestamps: true,  // Adds createdAt and updatedAt
  collection: 'eventlogs'  // Explicit collection name
});

// Compound indexes for efficient queries
EventLogSchema.index({ userId: 1, timestamp: -1 });  // User events by time
EventLogSchema.index({ userId: 1, status: 1 });      // User events by status
EventLogSchema.index({ status: 1, timestamp: -1 });  // All events by status and time

// Instance Methods
EventLogSchema.methods.markAsReversed = async function(
  this: IEventLog, 
  reverseToken: string
): Promise<void> {
  this.status = EventLogStatus.REVERSED;
  this.reversedAt = new Date();
  this.reversedByToken = reverseToken;
  await this.save();
};

EventLogSchema.methods.isReversible = function(this: IEventLog): boolean {
  return this.status === EventLogStatus.COMPLETED && !this.reversedAt;
};

EventLogSchema.methods.getReversalInstructions = function(this: IEventLog): ReversalData['undoInstructions'] {
  return this.reversalData.undoInstructions;
};

// Static Methods (attached to schema)
EventLogSchema.statics.findByToken = async function(token: string): Promise<IEventLog | null> {
  return await this.findOne({ token }).exec();
};

EventLogSchema.statics.findUserEvents = async function(
  userId: string,
  limit: number = 50
): Promise<IEventLog[]> {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

EventLogSchema.statics.findReversibleEvents = async function(userId: string): Promise<IEventLog[]> {
  return await this.find({ 
    userId, 
    status: EventLogStatus.COMPLETED,
    reversedAt: { $exists: false }
  })
    .sort({ timestamp: -1 })
    .limit(100)  // Reasonable limit for reversal candidates
    .exec();
};

EventLogSchema.statics.createEventLog = async function(
  contractData: RichProgressContract,
  reversalData: ReversalData
): Promise<IEventLog> {
  return await this.create({
    token: contractData.token,
    userId: new mongoose.Types.ObjectId(contractData.userId),
    contractData,
    reversalData,
    status: EventLogStatus.COMPLETED,
    timestamp: new Date()
  });
};

// Create and export the model using standard mongoose pattern
const EventLog = (mongoose.models.EventLog || 
  mongoose.model<IEventLog>('EventLog', EventLogSchema)) as Model<IEventLog> & {
  findByToken(token: string): Promise<IEventLog | null>;
  findUserEvents(userId: string, limit?: number): Promise<IEventLog[]>;
  findReversibleEvents(userId: string): Promise<IEventLog[]>;
  createEventLog(contractData: RichProgressContract, reversalData: ReversalData): Promise<IEventLog>;
};

export default EventLog;