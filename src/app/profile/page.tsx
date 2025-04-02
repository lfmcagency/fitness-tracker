// src/app/profile/page.tsx
import React from 'react';
import ProfileOverview from '@/components/profile/ProfileOverview';
import AppLayout from '@/components/layout/AppLayout'; // Assuming this is your layout component
// Removed useAuth import as ProfileOverview now uses useSession/useUserStore

// Define the page component
const ProfilePage: React.FC = () => {
  // Removed useAuth hook call as userId is no longer passed

  // Render the layout and the ProfileOverview component without props
  return (
    <AppLayout title="Profile" requireAuth={true}>
      {/* --- FIX: Remove the userId prop --- */}
      <ProfileOverview />
    </AppLayout>
  )
}

export default ProfilePage;