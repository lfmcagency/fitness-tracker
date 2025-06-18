/**
 * SIMPLIFIED EVENT LOG MODEL
 * 
 * Clean, simple event storage. No more complex contracts, just the essentials.
 * Each event is stored with its context and can be reversed if same-day.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { DomainEvent, EventContext } from '@/lib/event-coordinator/types';

/**
 * Event log status
 */
export enum EventLogStatus {
  COMPLETED = 'completed',
  FAILED = 'failed', 
  REVERSED = 'reversed'
}

/**
 * Simple event log document interface
 */
export interface ISimpleEventLog extends Document {
  dailyMacroProgress: any;
  mealData: ISimpleEventLog | null;
  /** Unique token for fast lookup */
  token: string;
  
  /** User who initiated the event */
  userId: mongoose.Types.ObjectId;
  
  /** Domain that processed the event */
  source: 'ethos' | 'trophe' | 'arete';
  
  /** Action that was performed */
  action: string;
  
  /** Complete event data */
  eventData: DomainEvent;
  
  /** Domain context that was calculated */
  context: EventContext;
  
  /** XP awarded for this event */
  xpAwarded: number;
  
  /** Current status */
  status: EventLogStatus;
  
  /** When the event was processed */
  timestamp: Date;
  
  /** When this was reversed (if applicable) */
  reversedAt?: Date;
  
  /** Token of the reverse operation (if applicable) */
  reversedByToken?: string;
  
  /** Optional error message if failed */
  errorMessage?: string;
  
  // Instance methods
  markAsReversed(reverseToken: string): Promise<void>;
  canBeReversed(): boolean;
}

/**
 * Simple event context schema - flexible for all domains
 */
const EventContextSchema = new Schema({
  // Task context
  taskId: String,
  taskName: String,
  streakCount: Number,
  totalCompletions: Number,
  isSystemTask: Boolean,
  
  // Meal context
  mealId: String,
  mealName: String,
  totalMeals: Number,
  dailyMacroProgress: Number,
  macroGoalsMet: Boolean,
  
  // Food context
  foodId: String,
  foodName: String,
  totalFoods: Number,
  isSystemFood: Boolean,
  
  // Weight context
  weightEntryId: String,
  currentWeight: Number,
  previousWeight: Number,
  weightChange: Number,
  totalEntries: Number,
  
  // Common fields
  milestoneHit: String
}, { 
  _id: false,
  strict: false // Allow additional fields for future domains
});

/**
 * Domain event schema - stores the complete event
 */
const DomainEventSchema = new Schema({
  token: { type: String, required: true },
  userId: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['ethos', 'trophe', 'arete'],
    required: true 
  },
  action: { type: String, required: true },
  timestamp: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed },
  
  // Domain-specific data (one will be populated)
  taskData: {
    taskId: String,
    taskName: String,
    streakCount: Number,
    totalCompletions: Number,
    completionDate: String,
    previousState: {
      streak: Number,
      totalCompletions: Number,
      completed: Boolean
    }
  },
  
  mealData: {
    mealId: String,
    mealName: String,
    mealDate: String,
    totalMeals: Number,
    dailyMacroProgress: {
      protein: Number,
      carbs: Number,
      fat: Number,
      calories: Number,
      total: Number
    },
    macroTotals: {
      protein: Number,
      carbs: Number,
      fat: Number,
      calories: Number
    }
  },
  
  foodData: {
    foodId: String,
    foodName: String,
    totalFoods: Number,
    isSystemFood: Boolean
  },
  
  weightData: {
    weightEntryId: String,
    currentWeight: Number,
    previousWeight: Number,
    weightChange: Number,
    totalEntries: Number,
    logDate: String
  }
}, { _id: false });

/**
 * Main simple event log schema
 */
const SimpleEventLogSchema = new Schema<ISimpleEventLog>({
  token: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  userId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: 'User',
    index: true
  },
  
  source: {
    type: String,
    enum: ['ethos', 'trophe', 'arete'],
    required: true,
    index: true
  },
  
  action: {
    type: String,
    required: true,
    index: true
  },
  
  eventData: {
    type: DomainEventSchema,
    required: true
  },
  
  context: {
    type: EventContextSchema,
    required: true
  },
  
  xpAwarded: {
    type: Number,
    required: true,
    default: 0
  },
  
  status: { 
    type: String, 
    enum: Object.values(EventLogStatus),
    required: true,
    default: EventLogStatus.COMPLETED,
    index: true
  },
  
  timestamp: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true
  },
  
  reversedAt: { 
    type: Date,
    index: true
  },
  
  reversedByToken: { 
    type: String,
    index: true
  },
  
  errorMessage: { 
    type: String,
    maxlength: 500
  }
}, { 
  timestamps: true,
  collection: 'simpleeventlogs'
});

// Compound indexes for efficient queries
SimpleEventLogSchema.index({ userId: 1, timestamp: -1 });
SimpleEventLogSchema.index({ userId: 1, status: 1 });
SimpleEventLogSchema.index({ source: 1, action: 1 });
SimpleEventLogSchema.index({ userId: 1, source: 1, timestamp: -1 });

// Instance Methods
SimpleEventLogSchema.methods.markAsReversed = async function(
  this: ISimpleEventLog, 
  reverseToken: string
): Promise<void> {
  this.status = EventLogStatus.REVERSED;
  this.reversedAt = new Date();
  this.reversedByToken = reverseToken;
  await this.save();
};

SimpleEventLogSchema.methods.canBeReversed = function(this: ISimpleEventLog): boolean {
  if (this.status !== EventLogStatus.COMPLETED) return false;
  if (this.reversedAt) return false;
  
  // Same day check
  const eventDate = new Date(this.timestamp);
  const today = new Date();
  eventDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return eventDate.getTime() === today.getTime();
};

// Static Methods
SimpleEventLogSchema.statics.findByToken = async function(token: string): Promise<ISimpleEventLog | null> {
  return await this.findOne({ token }).exec();
};

SimpleEventLogSchema.statics.findUserEvents = async function(
  userId: string,
  limit: number = 50
): Promise<ISimpleEventLog[]> {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

SimpleEventLogSchema.statics.findReversibleEvents = async function(
  userId: string
): Promise<ISimpleEventLog[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await this.find({ 
    userId, 
    status: EventLogStatus.COMPLETED,
    reversedAt: { $exists: false },
    timestamp: { $gte: today, $lt: tomorrow }
  })
    .sort({ timestamp: -1 })
    .limit(50)
    .exec();
};

SimpleEventLogSchema.statics.createEventLog = async function(
  eventData: DomainEvent,
  context: EventContext,
  xpAwarded: number = 0
): Promise<ISimpleEventLog> {
  return await this.create({
    token: eventData.token,
    userId: new mongoose.Types.ObjectId(eventData.userId),
    source: eventData.source,
    action: eventData.action,
    eventData,
    context,
    xpAwarded,
    status: EventLogStatus.COMPLETED,
    timestamp: eventData.timestamp
  });
};

SimpleEventLogSchema.statics.getEventStats = async function(userId: string): Promise<{
  totalEvents: number;
  todayEvents: number;
  reversedEvents: number;
  reversibleEvents: number;
  xpEarned: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [totalEvents, todayEvents, reversedEvents, reversibleEvents, xpResult] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, timestamp: { $gte: today, $lt: tomorrow } }),
    this.countDocuments({ userId, status: EventLogStatus.REVERSED }),
    this.countDocuments({ 
      userId, 
      status: EventLogStatus.COMPLETED,
      reversedAt: { $exists: false },
      timestamp: { $gte: today, $lt: tomorrow }
    }),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: EventLogStatus.COMPLETED } },
      { $group: { _id: null, totalXp: { $sum: '$xpAwarded' } } }
    ])
  ]);
  
  return {
    totalEvents,
    todayEvents,
    reversedEvents,
    reversibleEvents,
    xpEarned: xpResult[0]?.totalXp || 0
  };
};

// Create and export the model
const SimpleEventLog = (mongoose.models.SimpleEventLog || 
  mongoose.model<ISimpleEventLog>('SimpleEventLog', SimpleEventLogSchema)) as Model<ISimpleEventLog> & {
  findByToken(token: string): Promise<ISimpleEventLog | null>;
  findUserEvents(userId: string, limit?: number): Promise<ISimpleEventLog[]>;
  findReversibleEvents(userId: string): Promise<ISimpleEventLog[]>;
  createEventLog(eventData: DomainEvent, context: EventContext, xpAwarded?: number): Promise<ISimpleEventLog>;
  getEventStats(userId: string): Promise<{
    totalEvents: number;
    todayEvents: number;
    reversedEvents: number;
    reversibleEvents: number;
    xpEarned: number;
  }>;
};

export default SimpleEventLog;