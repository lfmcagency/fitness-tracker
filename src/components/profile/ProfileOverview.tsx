'use client';

import React, { useState, useEffect } from 'react';
import { TabsContent } from '@radix-ui/react-tabs';
import { User, Award, LineChart, Weight, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import ProfileCard from './ProfileCard';
import ProfileSettings from './ProfileSettings';
import { DetailExpander } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { colors } from '@/lib/colors';

interface ProfileOverviewProps {
  /** Optional user ID - if not provided, uses the currently authenticated user */
  userId?: string;
}

/**
 * ProfileOverview component - Main profile page with sections for settings and data
 */
const ProfileOverview: React.FC<ProfileOverviewProps> = ({ userId }) => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  
  // You would typically fetch additional profile data here
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user && !userId) return;
      
      try {
        setIsLoadingProfile(true);
        // Fetch additional profile data here if needed
        // const response = await fetch(`/api/user/profile${userId ? `?userId=${userId}` : ''}`);
        // const data = await response.json();
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchProfileData();
  }, [user, userId]);
  
  if (isLoading || isLoadingProfile) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-kalos-border rounded-full mb-4 mx-auto"></div>
          <div className="h-4 bg-kalos-border rounded w-48 mb-3"></div>
          <div className="h-3 bg-kalos-border rounded w-32"></div>
        </div>
      </div>
    );
  }
  
  if (!user && !userId) {
    return (
      <div className="text-center p-8">
        <p className="text-kalos-muted">Please sign in to view your profile</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Profile Card Section */}
      <section>
        <ProfileCard userId={userId} />
      </section>
      
      {/* Profile Tabs */}
      <section>
        <div className="flex border-b border-kalos-border space-x-6">
          {[
            { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4 mr-1" /> },
            { id: 'weight', label: 'Weight Tracking', icon: <Weight className="w-4 h-4 mr-1" /> },
            { id: 'achievements', label: 'Achievements', icon: <Award className="w-4 h-4 mr-1" /> },
            { id: 'stats', label: 'Statistics', icon: <LineChart className="w-4 h-4 mr-1" /> },
            { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4 mr-1" /> },
          ].map(tab => (
            <button
              key={tab.id}
              className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm -mb-px ${
                activeTab === tab.id 
                  ? `border-kalos-text text-kalos-text` 
                  : `border-transparent text-kalos-muted hover:text-kalos-text hover:border-kalos-muted`
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="py-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-kalos-muted">
                    View your profile information and progress across all training domains.
                  </p>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailExpander
                      title="Personal Information"
                      description="Your basic details and preferences"
                      defaultExpanded={true}
                    >
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-kalos-muted block">Name</span>
                          <span>{user?.name}</span>
                        </div>
                        <div>
                          <span className="text-sm text-kalos-muted block">Email</span>
                          <span>{user?.email}</span>
                        </div>
                        <div>
                          <span className="text-sm text-kalos-muted block">Account Type</span>
                          <span className="capitalize">{user?.role || 'Member'}</span>
                        </div>
                      </div>
                    </DetailExpander>
                    
                    <DetailExpander
                      title="Activity Summary"
                      description="Your recent activity stats"
                      defaultExpanded={true}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-kalos-bg rounded-md">
                          <div className="text-xl font-medium">42</div>
                          <div className="text-xs text-kalos-muted">Workouts</div>
                        </div>
                        <div className="text-center p-3 bg-kalos-bg rounded-md">
                          <div className="text-xl font-medium">78</div>
                          <div className="text-xs text-kalos-muted">Tasks</div>
                        </div>
                        <div className="text-center p-3 bg-kalos-bg rounded-md">
                          <div className="text-xl font-medium">15</div>
                          <div className="text-xs text-kalos-muted">Day Streak</div>
                        </div>
                        <div className="text-center p-3 bg-kalos-bg rounded-md">
                          <div className="text-xl font-medium">7</div>
                          <div className="text-xs text-kalos-muted">Achievements</div>
                        </div>
                      </div>
                    </DetailExpander>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      { action: 'Completed workout', target: 'Upper Body Strength', time: '2 hours ago' },
                      { action: 'Tracked meal', target: 'Lunch', time: '5 hours ago' },
                      { action: 'Completed task', target: 'Morning Meditation', time: '8 hours ago' },
                      { action: 'Updated weight', target: '72.5 kg', time: '1 day ago' },
                    ].map((activity, index) => (
                      <li key={index} className="py-2 border-b border-kalos-border last:border-0">
                        <div className="flex justify-between">
                          <div>
                            <span className="font-medium">{activity.action}</span>
                            <span className="text-kalos-muted"> - {activity.target}</span>
                          </div>
                          <span className="text-xs text-kalos-muted">{activity.time}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 'weight' && (
            <div>
              <p className="text-kalos-muted mb-4">Weight tracking component will be displayed here.</p>
              {/* Insert WeightHistoryDisplay component here when created */}
            </div>
          )}
          
          {activeTab === 'achievements' && (
            <div>
              <p className="text-kalos-muted mb-4">Achievements will be displayed here.</p>
              {/* Insert Achievements component here when created */}
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div>
              <p className="text-kalos-muted mb-4">Statistics will be displayed here.</p>
              {/* Insert Statistics component here when created */}
            </div>
          )}
          
          {activeTab === 'settings' && (
            <ProfileSettings onSaved={() => setActiveTab('overview')} />
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfileOverview;