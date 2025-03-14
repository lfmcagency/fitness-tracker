// src/models/UserProgress.ts
import mongoose, { Schema, Model, HydratedDocument } from 'mongoose';
import { awardXp } from '@/lib/xp-manager-improved';
import {
  IUserProgress,
  IUserProgressModel,
  XpTransaction,
  XpDailySummary,
  BodyweightEntry,
  CategoryProgress,
} from '@/types/models/progress';
import { ProgressCategory } from '@/constants/progressCategories'; // Adjust the path as necessary

// Define schemas
const xpTransactionSchema = new Schema<XpTransaction>({
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  category: { type: String, enum: Object.values(ProgressCategory), default: undefined },
  date: { type: Date, required: true },
  description: String,
  timestamp: Number,
});

const xpDailySummarySchema = new Schema<XpDailySummary>({
  date: { type: Date, required: true },
  totalXp: { type: Number, required: true },
  sources: { type: Map, of: Number, default: {} },
  categories: {
    core: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    pull: { type: Number, default: 0 },
    legs: { type: Number, default: 0 },
  },
});

const categoryProgressSchema = new Schema<CategoryProgress>({
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  unlockedExercises: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
});

const bodyweightEntrySchema = new Schema<BodyweightEntry>({
  date: { type: Date, default: Date.now },
  value: { type: Number, required: true },
  unit: { type: String, enum: ['kg', 'lb'], default: 'kg', required: true },
});

// Main schema
const userProgressSchema = new Schema<IUserProgress>({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  totalXp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  categoryXp: {
    core: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    pull: { type: Number, default: 0 },
    legs: { type: Number, default: 0 },
  },
  categoryProgress: {
    core: categoryProgressSchema,
    push: categoryProgressSchema,
    pull: categoryProgressSchema,
    legs: categoryProgressSchema,
  },
  achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
  xpHistory: [xpTransactionSchema],
  dailySummaries: [xpDailySummarySchema],
  bodyweight: [bodyweightEntrySchema],
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Static methods
userProgressSchema.statics.calculateLevelFromXp = function (xp: number): number {
  return Math.floor(1 + Math.pow(xp / 100, 0.8));
};

userProgressSchema.statics.createInitialProgress = async function (
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

// Instance methods
userProgressSchema.methods.calculateLevel = function (this: HydratedDocument<IUserProgress>, xp: number): number {
  return (this.constructor as IUserProgressModel).calculateLevelFromXp(xp);
};

userProgressSchema.methods.addXp = async function (
  this: HydratedDocument<IUserProgress>,
  amount: number,
  source: string,
  category?: ProgressCategory,
  description?: string
): Promise<boolean> {
  const result = await awardXp(this.userId, amount, source, category, description);
  this.totalXp = result.totalXp;
  this.level = result.currentLevel;
  if (category) {
    this.categoryXp[category] += amount;
    this.categoryProgress[category].xp = this.categoryXp[category];
    this.categoryProgress[category].level = this.calculateLevel(this.categoryXp[category]);
  }
  this.lastUpdated = new Date();
  await this.save();
  return result.leveledUp;
};

userProgressSchema.methods.getNextLevelXp = function (this: HydratedDocument<IUserProgress>): number {
  const nextLevel = this.level + 1;
  return Math.ceil(Math.pow(nextLevel - 1, 1.25) * 100);
};

userProgressSchema.methods.getXpToNextLevel = function (this: HydratedDocument<IUserProgress>): number {
  return this.getNextLevelXp() - this.totalXp;
};

userProgressSchema.methods.hasLeveledUp = function (
  this: HydratedDocument<IUserProgress>,
  previousXp: number,
  newXp: number
): boolean {
  return this.calculateLevel(newXp) > this.calculateLevel(previousXp);
};

userProgressSchema.methods.summarizeDailyXp = async function (
  this: HydratedDocument<IUserProgress>,
  date: Date = new Date()
): Promise<XpDailySummary> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const dayTransactions = this.xpHistory.filter((tx: XpTransaction) => {
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

  const summary: XpDailySummary = { date: startOfDay, totalXp, sources, categories };
  const existingIndex = this.dailySummaries.findIndex((s: XpDailySummary) =>
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

userProgressSchema.methods.purgeOldHistory = async function (
  this: HydratedDocument<IUserProgress>,
  olderThan: Date
): Promise<number> {
  const beforeCount = this.xpHistory.length;
  this.xpHistory = this.xpHistory.filter((tx: XpTransaction) => new Date(tx.date) >= olderThan);
  const removedCount = beforeCount - this.xpHistory.length;
  if (removedCount > 0) await this.save();
  return removedCount;
};

const UserProgress = mongoose.models.UserProgress || mongoose.model<IUserProgress, IUserProgressModel>('UserProgress', userProgressSchema);
export default UserProgress;
export type { XpTransaction, XpDailySummary }; // Ensure these are exported