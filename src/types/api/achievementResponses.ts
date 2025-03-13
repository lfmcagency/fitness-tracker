export type ClaimAchievementData = {
    claimed: boolean;
    message: string;
    achievement?: {
      id: string;
      title: string;
      xpReward: number;
    };
    xpAwarded?: number;
  };