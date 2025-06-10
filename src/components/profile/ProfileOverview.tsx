'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { useSession } from 'next-auth/react';
import ProfileCard from './ProfileCard';
import ProfileSettings from './ProfileSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* ProfileCard skeleton */}
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm animate-pulse p-6">
      <div className="flex items-center space-x-4">
        <div className="rounded-full bg-kalos-border h-12 w-12"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-kalos-border rounded w-3/4"></div>
          <div className="h-3 bg-kalos-border rounded w-1/2"></div>
        </div>
      </div>
    </div>
    {/* Settings skeleton */}
    <div className="animate-pulse space-y-4 p-4 border border-kalos-border rounded-lg">
      <div className="h-6 bg-kalos-border rounded w-1/2 mb-4"></div>
      <div className="h-10 bg-kalos-border rounded w-full"></div>
      <div className="h-10 bg-kalos-border rounded w-full"></div>
    </div>
  </div>
);

const ProfileOverview: React.FC = () => {
  const { status } = useSession();
  
  // User store - simplified, no progress integration
  const {
    initializeUser,
    profile,
    isLoadingProfile,
    error: userError,
  } = useUserStore();

  // Initialize user store when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      console.log("ProfileOverview: Initializing user data...");
      
      // Start user data if not already loading/loaded
      if (!profile && !isLoadingProfile) {
        initializeUser();
      }
    }
  }, [status, initializeUser, profile, isLoadingProfile]);

  // --- Render Logic ---

  // 1. Auth loading
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kalos-text"></div>
      </div>
    );
  }

  // 2. Not authenticated
  if (status !== 'authenticated') {
    return (
      <div className="text-center p-8">
        <p className="text-kalos-muted">Please sign in to view your profile.</p>
      </div>
    );
  }

  // 3. Still loading initial data
  if (isLoadingProfile && !profile) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {userError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {userError}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Card */}
      <section>
        <ProfileCard showActions={false} />
      </section>

      {/* Settings Section */}
      <section>
        <ProfileSettings />
      </section>

      {/* Admin Section - Only show for admin users */}
      {profile?.role === 'admin' && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Admin Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <Link 
                href="/admin/database"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Database Management
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Future Integration Placeholder */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-500">Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Progress tracking will be integrated after all domains are complete.</p>
              <p className="text-sm mt-2">Check the main dashboard for current progress data.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ProfileOverview;