'use client';

import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/user'; // Import the store hook
import { useAuth } from '@/components/auth/AuthProvider'; // Use AuthProvider for session status
import ProfileCard from './ProfileCard';
import ProfileSettings from './ProfileSettings';
import WeightEntryForm from './WeightEntryForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DetailExpander } from '@/components/shared'; // Keep using DetailExpander

/**
 * ProfileOverview component - Main profile page view.
 * Displays ProfileCard, Weight Entry Form, and Profile Settings.
 * Fetches necessary data using the Zustand store.
 */
const ProfileOverview: React.FC = () => {
  const { status } = useAuth(); // Get session status ('authenticated', 'loading', 'unauthenticated')
  const initializeUser = useUserStore((state) => state.initializeUser);
  const profile = useUserStore((state) => state.profile);
  const isLoadingProfile = useUserStore((state) => state.isLoadingProfile);
  const error = useUserStore((state) => state.error);
  const clearError = useUserStore((state) => state.clearError);

  // Fetch initial user data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
        console.log("ProfileOverview: Authenticated, initializing user data...");
        initializeUser();
    }
    // Clear previous errors on mount or status change
    return () => {
      clearError();
    };
  }, [status, initializeUser, clearError]);


  // --- Render Logic ---

  // Loading state (authentication loading)
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kalos-text"></div>
      </div>
    );
  }

  // Unauthenticated state
  if (status !== 'authenticated') {
    return (
      <div className="text-center p-8">
        <p className="text-kalos-muted">Please sign in to view your profile.</p>
        {/* Optionally add a sign-in link/button here */}
      </div>
    );
  }

  // Authenticated: Display profile content

  // Loading state (profile data loading)
  const showProfileLoading = isLoadingProfile && !profile;

  return (
    <div className="space-y-8">
      {/* Global Error Display */}
      {error && (
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

      {/* Profile Card Section */}
      <section>
        {/* ProfileCard handles its own loading state based on store */}
        <ProfileCard showActions={false} showStatsSummary={true} />
      </section>

      {/* Activity Summary Section (Example - Data from profile needed) */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {showProfileLoading ? (
               <div className="animate-pulse space-y-2">
                 <div className="h-4 bg-kalos-border rounded w-3/4"></div>
                 <div className="h-4 bg-kalos-border rounded w-1/2"></div>
               </div>
             ) : profile?.stats ? (
                // Replace with actual stats display - grid or list
               <div className="grid grid-cols-2 gap-4">
                 <StatItem label="Level" value={profile.stats.level ?? 1} />
                 <StatItem label="XP" value={profile.stats.xp ?? 0} />
                 {/* Add more derived stats if needed */}
                 <StatItem label="Workouts This Month" value={0} />
                 <StatItem label="Tasks Today" value={0} />
               </div>
             ) : (
               <p className="text-kalos-muted">Activity data not available.</p>
             )}
          </CardContent>
        </Card>
      </section>

      {/* Weight Logging Section */}
      <section>
        {/* WeightEntryForm now lives directly here */}
        <WeightEntryForm onSuccess={() => { /* Optional: Add success feedback */ }} />
      </section>

      {/* Settings Section */}
      <section>
        {/* ProfileSettings component */}
        <ProfileSettings />
      </section>

      {/* Placeholder for future Arete/Achievements link */}
      <section>
          <Card className="text-center p-4 border-dashed border-kalos-border">
              <p className="text-kalos-muted">
                  View detailed progress and achievements in the <span className="font-medium text-kalos-text">Arete</span> section.
              </p>
              {/* <Link href="/arete" className="text-sm text-kalos-primary hover:underline">Go to Arete</Link> */}
          </Card>
      </section>

    </div>
  );
};

// Helper component for stats display
const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-3 bg-kalos-bg rounded-md text-center">
    <div className="text-xl font-medium text-kalos-text">{value}</div>
    <div className="text-xs text-kalos-muted mt-1">{label}</div>
  </div>
);

export default ProfileOverview;