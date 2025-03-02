import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Define XP transaction interface
export interface XpTransaction {
  amount: number;
  source: string;
  category?: 'core' | 'push' | 'pull' | 'legs';
  date: Date;
  description?: string;
  // Adding a timestamp for precise ordering in time-series data
  timestamp?: number;
}

// Define daily aggregate summary for optimized history storage
export interface XpDailySummary {
  date: Date;
  totalXp: number;
  sources: {
    [key: string]: number;
  };
  categories: {
    core: number;
    push: number;
    pull: number;
    legs: number;
  };
}

export interface CategoryProgress {
  level: number;
  xp: number;
  unlockedExercises: Types.ObjectId[];
}

// Base interface for UserProgress properties without Document methods
export interface UserProgressData {
  userId: Types.ObjectId;
  totalXp: number;
  level: number;
  categoryXp: {
    core: number;
    push: number;
    pull: number;
    legs: number;
  };
  categoryProgress: {
    core: CategoryProgress;
    push: CategoryProgress;
    pull: CategoryProgress;
    legs: CategoryProgress;
  };
  achievements: Types.ObjectId[];
  xpHistory: XpTransaction[];
  dailySummaries: XpDailySummary[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Methods interface for UserProgress document
export interface UserProgressMethods {
  calculateLevel(xp: number): number;
  addXp(amount: number, source: string, category?: 'core' | 'push' | 'pull' | 'legs', description?: string): Promise<boolean>;
  getNextLevelXp(): number;
  getXpToNextLevel(): number;
  hasLeveledUp(previousXp: number, newXp: number): boolean;
  summarizeDailyXp(date?: Date): Promise<XpDailySummary>;
  purgeOldHistory(olderThan: Date): Promise<number>;
}

// Combined interface for both data and methods
export interface IUserProgress extends UserProgressData, UserProgressMethods, Document {}

// Static methods interface
export interface IUserProgressModel extends Model<IUserProgress, {}, UserProgressMethods> {
  createInitialProgress(userId: Types.ObjectId): Promise<IUserProgress>;
  calculateLevelFromXp(xp: number): number;
}

const XpTransactionSchema = new Schema({
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  category: { type: String, enum: ['core', 'push', 'pull', 'legs'] },
  date: { type: Date, default: Date.now },
  description: { type: String },
  timestamp: { type: Number }
});

const XpDailySummarySchema = new Schema({
  date: { type: Date, required: true },
  totalXp: { type: Number, default: 0 },
  sources: { type: Map, of: Number, default: {} },
  categories: {
    core: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    pull: { type: Number, default: 0 },
    legs: { type: Number, default: 0 }
  }
});

const CategoryProgressSchema = new Schema({
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  unlockedExercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }]
});

const UserProgressSchema = new Schema<IUserProgress, IUserProgressModel, UserProgressMethods>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true
  },
  totalXp: { type: Number, default: 0 },
  level: { 
    type: Number, 
    default: 1,
    min: 1
  },
  categoryXp: {
    core: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    pull: { type: Number, default: 0 },
    legs: { type: Number, default: 0 }
  },
  categoryProgress: {
    core: { type: CategoryProgressSchema, default: () => ({}) },
    push: { type: CategoryProgressSchema, default: () => ({}) },
    pull: { type: CategoryProgressSchema, default: () => ({}) },
    legs: { type: CategoryProgressSchema, default: () => ({}) }
  },
  achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
  xpHistory: [XpTransactionSchema],
  dailySummaries: [XpDailySummarySchema],
  lastUpdated: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

// Method to calculate level from XP
UserProgressSchema.statics.calculateLevelFromXp = function(xp: number): number {
  return Math.floor(1 + Math.pow(xp / 100, 0.8));
};

// Create initial progress document for new user
UserProgressSchema.statics.createInitialProgress = async function(userId: Types.ObjectId): Promise<IUserProgress> {
  const initialProgress = new this({
    userId,
    totalXp: 0,
    level: 1,
    categoryXp: {
      core: 0,
      push: 0,
      pull: 0,
      legs: 0
    },
    categoryProgress: {
      core: { level: 1, xp: 0, unlockedExercises: [] },
      push: { level: 1, xp: 0, unlockedExercises: [] },
      pull: { level: 1, xp: 0, unlockedExercises: [] },
      legs: { level: 1, xp: 0, unlockedExercises: [] }
    },
    xpHistory: [{
      amount: 0,
      source: 'account_creation',
      date: new Date(),
      description: 'Initial progress tracking setup',
      timestamp: Date.now()
    }],
    dailySummaries: [{
      date: new Date(),
      totalXp: 0,
      sources: { account_creation: 0 },
      categories: {
        core: 0,
        push: 0,
        pull: 0,
        legs: 0
      }
    }]
  });

  return initialProgress.save();
};

// Calculate level based on XP
UserProgressSchema.methods.calculateLevel = function(xp: number): number {
  return (this.constructor as IUserProgressModel).calculateLevelFromXp(xp);
};

// Add XP to user's total and category if specified
UserProgressSchema.methods.addXp = async function(
  amount: number, 
  source: string, 
  category?: 'core' | 'push' | 'pull' | 'legs',
  description?: string
): Promise<boolean> {
  const previousXp = this.totalXp;
  const previousLevel = this.level;
  
  // Add to total XP
  this.totalXp += amount;
  
  // Add to category XP if specified
  if (category) {
    this.categoryXp[category] += amount;
    
    // Update category progress level
    this.categoryProgress[category].xp += amount;
    this.categoryProgress[category].level = this.calculateLevel(this.categoryProgress[category].xp);
  }
  
  // Current timestamp for precise ordering
  const currentTimestamp = Date.now();
  
  // Record the transaction
  this.xpHistory.push({
    amount,
    source,
    category,
    date: new Date(),
    description,
    timestamp: currentTimestamp
  });
  
  // Update daily summary
  await this.summarizeDailyXp();
  
  // Recalculate the level
  this.level = this.calculateLevel(this.totalXp);
  
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  
  // Save the changes
  await this.save();
  
  // Return true if user leveled up
  return this.level > previousLevel;
};

// Summarize XP for the current day
UserProgressSchema.methods.summarizeDailyXp = async function(dateToSummarize?: Date): Promise<XpDailySummary> {
  const targetDate = dateToSummarize || new Date();
  
  // Reset time to start of day for consistent date comparison
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Find transactions for this day
  const dayTransactions = this.xpHistory.filter(transaction => {
    const txDate = new Date(transaction.date);
    return txDate >= startOfDay && txDate <= endOfDay;
  });
  
  // If no transactions on this day, return empty summary
  if (dayTransactions.length === 0) {
    return {
      date: startOfDay,
      totalXp: 0,
      sources: {},
      categories: {
        core: 0,
        push: 0,
        pull: 0,
        legs: 0
      }
    };
  }
  
  // Calculate totals
  let totalXp = 0;
  const sources: { [key: string]: number } = {};
  const categories = {
    core: 0,
    push: 0,
    pull: 0,
    legs: 0
  };
  
  // Process all transactions
  for (const tx of dayTransactions) {
    totalXp += tx.amount;
    
    // Add to source totals
    if (!sources[tx.source]) {
      sources[tx.source] = 0;
    }
    sources[tx.source] += tx.amount;
    
    // Add to category totals if specified
    if (tx.category) {
      categories[tx.category] += tx.amount;
    }
  }
  
  // Create summary object
  const summary: XpDailySummary = {
    date: startOfDay,
    totalXp,
    sources,
    categories
  };
  
  // Check if we already have a summary for this day
  const existingSummaryIndex = this.dailySummaries.findIndex(s => {
    const summaryDate = new Date(s.date);
    return summaryDate.toDateString() === startOfDay.toDateString();
  });
  
  if (existingSummaryIndex >= 0) {
    // Update existing summary
    this.dailySummaries[existingSummaryIndex] = summary;
  } else {
    // Add new summary
    this.dailySummaries.push(summary);
  }
  
  return summary;
};

// Purge old history entries for performance
UserProgressSchema.methods.purgeOldHistory = async function(olderThan: Date): Promise<number> {
  // Keep track of how many items we'll remove
  const beforeCount = this.xpHistory.length;
  
  // Filter out transactions older than the specified date
  this.xpHistory = this.xpHistory.filter(tx => new Date(tx.date) >= olderThan);
  
  // Calculate how many items were removed
  const removedCount = beforeCount - this.xpHistory.length;
  
  // If we removed any items, save the document
  if (removedCount > 0) {
    await this.save();
  }
  
  return removedCount;
};

// Get XP required for next level
UserProgressSchema.methods.getNextLevelXp = function(): number {
  const nextLevel = this.level + 1;
  // Reverse the level formula to find XP needed for next level
  // level = 1 + Math.pow(xp / 100, 0.8)
  // nextLevel - 1 = Math.pow(xp / 100, 0.8)
  // Math.pow(nextLevel - 1, 1/0.8) = xp / 100
  // Math.pow(nextLevel - 1, 1.25) * 100 = xp
  return Math.ceil(Math.pow(nextLevel - 1, 1.25) * 100);
};

// Get XP remaining to reach next level
UserProgressSchema.methods.getXpToNextLevel = function(): number {
  return this.getNextLevelXp() - this.totalXp;
};

// Check if user leveled up
UserProgressSchema.methods.hasLeveledUp = function(previousXp: number, newXp: number): boolean {
  const previousLevel = this.calculateLevel(previousXp);
  const newLevel = this.calculateLevel(newXp);
  return newLevel > previousLevel;
};

// Create model or use existing one
const UserProgress = mongoose.models.UserProgress as IUserProgressModel || 
  mongoose.model<IUserProgress, IUserProgressModel>('UserProgress', UserProgressSchema);

export default UserProgress;