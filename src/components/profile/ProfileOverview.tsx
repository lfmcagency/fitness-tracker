'use client';

import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { useSession } from 'next-auth/react'; // Use useSession FOR STATUS
import ProfileCard from './ProfileCard';
import ProfileSettings from './ProfileSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper component for internal loading state skeleton
const LoadingSkeleton: React.FC = () => (
    <div className="space-y-8">
        {/* ProfileCard skeleton */}
        <div className={`bg-white border border-kalos-border rounded-lg shadow-sm animate-pulse p-6`}>
            <div className="flex items-center space-x-4"> <div className="rounded-full bg-kalos-border h-12 w-12"></div> <div className="flex-1 space-y-2"> <div className="h-4 bg-kalos-border rounded w-3/4"></div> <div className="h-3 bg-kalos-border rounded w-1/2"></div> </div> </div>
            <div className="mt-4 grid grid-cols-3 gap-4"> <div className="h-8 bg-kalos-border rounded"></div> <div className="h-8 bg-kalos-border rounded"></div> <div className="h-8 bg-kalos-border rounded"></div> </div>
        </div>
        {/* Other section skeletons */}
        <div className="animate-pulse space-y-4 p-4 border border-kalos-border rounded-lg"> <div className="h-6 bg-kalos-border rounded w-1/2 mb-4"></div> <div className="h-10 bg-kalos-border rounded w-full"></div> <div className="h-10 bg-kalos-border rounded w-full"></div> </div>
        <div className="animate-pulse space-y-4 p-4 border border-kalos-border rounded-lg"> <div className="h-6 bg-kalos-border rounded w-1/2 mb-4"></div> <div className="h-16 bg-kalos-border rounded w-full"></div> </div>
    </div>
);

/**
 * ProfileOverview component - Main profile page view.
 * Uses useSession for auth status check. Handles loading states robustly.
 */
const ProfileOverview: React.FC = () => {
  const { status } = useSession(); // Get session status ('authenticated', 'loading', 'unauthenticated')
  const {
      initializeUser,
      profile,
      isLoadingProfile, // Loading specifically for profile data fetch
      storeError,
      clearError
  } = useUserStore(state => ({
      initializeUser: state.initializeUser,
      profile: state.profile,
      isLoadingProfile: state.isLoadingProfile,
      storeError: state.error,
      clearError: state.clearError
  }));

  // Fetch initial user data *only once* when authenticated and profile isn't loaded/loading
  useEffect(() => {
    if (status === 'authenticated' && !profile && !isLoadingProfile) {
        console.log("ProfileOverview useEffect: Status authenticated, no profile, not loading -> initializing user data...");
        initializeUser(); // This calls fetchUserProfile and fetchSettings
    }
    // Cleanup function to clear store errors on unmount or when logged out
    return () => {
      if (status !== 'authenticated') {
          // Optionally clear the whole user state on logout, handled elsewhere?
          // For now, just clear errors if the component unmounts while logged out
          // clearError(); // Clearing errors might hide useful info if navigating away due to error
      }
    };
    // Dependencies: status drives the effect, others prevent re-running unnecessarily
  }, [status, initializeUser, profile, isLoadingProfile]);


  // --- Render Logic ---

  // 1. Initial Auth Loading State (useSession hook checking status)
  if (status === 'loading') {
    console.log("ProfileOverview Render: Status == 'loading'");
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kalos-text"></div>
        {/* Optional: You could render the LoadingSkeleton here too */}
      </div>
    );
  }

  // 2. Unauthenticated State
  if (status !== 'authenticated') {
    console.log("ProfileOverview Render: Status != 'authenticated'");
    return (
      <div className="text-center p-8">
        <p className="text-kalos-muted">Please sign in to view your profile.</p>
      </div>
    );
  }

  // 3. Authenticated State - Now check profile data loading
  console.log(`ProfileOverview Render: Status == 'authenticated'. Profile Loading: ${isLoadingProfile}, Profile Exists: ${!!profile}`);

  // Display internal loading skeleton ONLY if authenticated but profile data is still being fetched
  if (isLoadingProfile || !profile) {
     console.log("ProfileOverview Render: Authenticated, but showing LoadingSkeleton (isLoadingProfile || !profile)");
     return <LoadingSkeleton />;
  }

  // 4. Authenticated AND Profile Data Loaded State
  console.log("ProfileOverview Render: Authenticated and profile data loaded, rendering main content.");
  return (
    <div className="space-y-8">
      {/* Global Store Error Display */}
      {storeError && (
         <Alert variant="destructive" className="mb-4"> {/* Added margin bottom */}
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>{storeError}</AlertDescription>
         </Alert>
       )}

      {/* Profile Card: Renders actual data because !isLoadingProfile and profile exists */}
      <section><ProfileCard showActions={false} showStatsSummary={true} /></section>

      {/* Activity Summary: Use data from profile.stats */}
      <section>
        <Card>
          <CardHeader><CardTitle className="text-lg">Activity Overview</CardTitle></CardHeader>
          <CardContent>
            {profile.stats ? (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <StatItem label="Level" value={profile.stats.level ?? 1} />
                 <StatItem label="Experience" value={profile.stats.xp ?? 0} />
                 {/* Add more real stats when available */}
                 <StatItem label="Workouts (Month)" value={0} />
                 <StatItem label="Tasks (Today)" value={0} />
               </div>
             ) : (
               <p className="text-kalos-muted">Activity data not available.</p>
             )}
          </CardContent>
        </Card>
      </section>
   
      {/* Settings Section */}
      <section><ProfileSettings /></section>

      {/* Optional Link to Arete */}
      {/* <section><Card className="text-center p-4 border-dashed border-kalos-border"><p>...</p></Card></section> */}
    </div>
  );
};

// Helper component for stats display (reuse from previous)
const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-3 bg-kalos-bg rounded-md text-center">
    <div className="text-xl font-medium text-kalos-text">{value}</div>
    <div className="text-xs text-kalos-muted mt-1">{label}</div>
  </div>
);

export default ProfileOverview;