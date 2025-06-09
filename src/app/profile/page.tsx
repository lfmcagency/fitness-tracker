// src/app/profile/page.tsx
import React from 'react';
import ProfileOverview from '@/components/profile/ProfileOverview';
import AppLayout from '@/components/layout/AppLayout';

/**
 * Profile page - displays user profile and progress information
 */
const ProfilePage: React.FC = () => {
  return (
    <AppLayout title="Profile" requireAuth={true}>
      <ProfileOverview />
    </AppLayout>
  );
};

export default ProfilePage;