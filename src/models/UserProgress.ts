// src/models/UserProgress.ts
import mongoose, { Schema, HydratedDocument } from 'mongoose';
import { IUserProgress, IUserProgressModel, ProgressCategory } from '../types/models/progress';
import { awardXp } from '@/lib/xp-manager-improved';

const XpTransactionSchema = new Schema({
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  category: { type: String, enum: ['core', 'push', 'pull', 'legs'] },
  date: { type: Date, default: Date.now },
  description: { type: String },
  timestamp: { type: Number, default: () => Date.now() },
});

const XpDailySummarySchema = new Schema({
  date: { type: Date, required: true },
  totalXp: { type: Number, default: 0 },
  sources: { type: Map, of: Number, default: {} },
  categories: {
    core: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    pull: { type: Number, default: 0 },
    legs: { type: Number, default: 0 },
  },
});

const CategoryProgressSchema = new Schema({
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  unlockedExercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
});

const BodyweightEntrySchema = new Schema({
  date: { type: Date, default: Date.now },
  value: { type: Number, required: true },
  unit: { type: String, enum: ['kg', 'lb'], default: 'kg', required: true }, // Ensure unit is required
});

const UserProgressSchema = new Schema<IUserProgress, IUserProgressModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalXp: { type: Number, default: 0 },
  level: { type: Number, default: 1, min: 1 },
  categoryXp: {
    core: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    pull: { type: Number, default: 0 },
    legs: { type: Number, default: 0 },
  },
  categoryProgress: {
    core: { type: CategoryProgressSchema, default: () => ({}) },
    push: { type: CategoryProgressSchema, default: () => ({}) },
    pull: { type: CategoryProgressSchema, default: () => ({}) },
    legs: { type: CategoryProgressSchema, default: () => ({}) },
  },
  achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
  xpHistory: [XpTransactionSchema],
  dailySummaries: [XpDailySummarySchema],
  bodyweight: [BodyweightEntrySchema],
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// Static Methods
UserProgressSchema.statics.calculateLevelFromXp = function (xp: number): number {
  return Math.floor(1 + Math.pow(xp / 100, 0.8));
};

UserProgressSchema.statics.createInitialProgress = async function (
  userId: mongoose.Types.ObjectId
): Promise<HydratedDocument<IUserProgress>> {
  return await this.create({
    userId,
    totalXp: 0,
    level: 1,
    categoryXp: { core: 0, push: 0, pull: 0, legs: 0 },
    categoryProgress: {
      core: { level: 1, xp: 0, unlockedExercises: [] },
      push: { level: 1, xp: 0, unlockedExercises: [] },
      pull: { level: 1, xp: 0, unlockedExercises: [] },
      legs: { level: 1, xp: 0, unlockedExercises: [] },
    },
    xpHistory: [{
      amount: 0,
      source: 'account_creation',
      date: new Date(),
      description: 'Initial progress tracking setup',
      timestamp: Date.now(),
    }],
    dailySummaries: [{
      date: new Date(),
      totalXp: 0,
      sources: { account_creation: 0 },
      categories: { core: 0, push: 0, pull: 0, legs: 0 },
    }],
    bodyweight: [],
  });
};

// Instance Methods
UserProgressSchema.methods.calculateLevel = function (xp: number): number {
  return (this.constructor as IUserProgressModel).calculateLevelFromXp(xp);
};

UserProgressSchema.methods.addXp = async function (
  amount: number,
  source: string,
  category?: ProgressCategory,
  description?: string
): Promise<boolean> {
  const result = await awardXp(this.userId, amount, source, category, description);
  this.totalXp = result.totalXp;
  this.level = result.currentLevel;
  if (category) {
    this.categoryXp[category] += amount; // Update category XP directly
    this.categoryProgress[category].xp = this.categoryXp[category];
    this.categoryProgress[category].level = this.calculateLevel(this.categoryXp[category]);
  }
  this.lastUpdated = new Date();
  await this.save();
  return result.leveledUp;
};

UserProgressSchema.methods.getNextLevelXp = function (): number {
  const nextLevel = this.level + 1;
  return Math.ceil(Math.pow(nextLevel - 1, 1.25) * 100);
};

UserProgressSchema.methods.getXpToNextLevel = function (): number {
  return this.getNextLevelXp() - this.totalXp;
};

UserProgressSchema.methods.hasLeveledUp = function (previousXp: number, newXp: number): boolean {
  return this.calculateLevel(newXp) > this.calculateLevel(previousXp);
};

UserProgressSchema.methods.summarizeDailyXp = async function (date?: Date): Promise<any> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const dayTransactions = this.xpHistory.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= startOfDay && txDate <= endOfDay;
  });

  if (dayTransactions.length === 0) {
    return { date: startOfDay, totalXp: 0, sources: {}, categories: { core: 0, push: 0, pull: 0, legs: 0 } };
  }

  let totalXp = 0;
  const sources: { [key: string]: number } = {};
  const categories = { core: 0, push: 0, pull: 0, legs: 0 };

  for (const tx of dayTransactions) {
    totalXp += tx.amount;
    sources[tx.source] = (sources[tx.source] || 0) + tx.amount;
    if (tx.category) categories[tx.category] += tx.amount;
  }

  const summary = { date: startOfDay, totalXp, sources, categories };
  const existingIndex = this.dailySummaries.findIndex(s =>
    new Date(s.date).toDateString() === startOfDay.toDateString()
  );

  if (existingIndex >= 0) {
    this.dailySummaries[existingIndex] = summary;
  } else {
    this.dailySummaries.push(summary);
  }
  await this.save();
  return summary;
};

UserProgressSchema.methods.purgeOldHistory = async function (olderThan: Date): Promise<number> {
  const beforeCount = this.xpHistory.length;
  this.xpHistory = this.xpHistory.filter(tx => new Date(tx.date) >= olderThan);
  const removedCount = beforeCount - this.xpHistory.length;
  if (removedCount > 0) await this.save();
  return removedCount;
};

export default mongoose.models.UserProgress || mongoose.model<IUserProgress, IUserProgressModel>('UserProgress', UserProgressSchema);