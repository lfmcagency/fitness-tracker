'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react'; // Ensure correct import
import { CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { useUserStore } from '@/store/user'; // Import the store hook
import { IUserSettings } from '@/types/models/user'; // Use the clean model type
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DetailExpander } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSettings: React.FC = () => {
  // Select state and actions from store
  const {
      storeSettings,
      isLoading, // Loading for initial fetch
      isUpdating, // Loading for PUT request
      storeError, // Global error from store
      updateSettings,
      clearError,
      clearUserState // Action to clear Zustand state on logout
  } = useUserStore(state => ({
      storeSettings: state.settings,
      isLoading: state.isLoadingSettings,
      isUpdating: state.isUpdatingSettings,
      storeError: state.error,
      updateSettings: state.updateSettings,
      clearError: state.clearError,
      clearUserState: state.clearUserState
  }));

  // Local state for managing form changes and feedback
  const [localSettings, setLocalSettings] = useState<Partial<IUserSettings>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when store settings are loaded/updated
  useEffect(() => {
    // Only update local state if storeSettings actually has data
    // and avoid resetting local changes if the store update was triggered by this component saving
    if (storeSettings && !isUpdating) {
      setLocalSettings(storeSettings);
      setHasChanges(false); // Reset changes indicator when synced with store
    }
  }, [storeSettings, isUpdating]); // Depend on storeSettings and isUpdating flag

  // Handle local setting changes
  const handleSettingChange = (setting: keyof IUserSettings, value: string) => {
    setLocalSettings((prev) => {
      const newSettings = { ...prev, [setting]: value };
      // Check against original store settings to see if actual change occurred
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(storeSettings || {}));
      return newSettings;
    });
    // Clear feedback messages on change
    setSuccess(null);
    // Don't clear storeError here, let global display handle it
    // clearError();
  };

  // Save settings handler
  const handleSaveSettings = async () => {
    if (!hasChanges || !storeSettings) {
        console.log("Save aborted: No changes or no initial settings.");
        return;
    }
    setSuccess(null); // Clear previous success message before saving
    const saveSuccessful = await updateSettings(localSettings); // Call store action
    if (saveSuccessful) {
      setSuccess('Settings saved successfully');
      setHasChanges(false); // Reset changes state after successful save
    }
    // Error display is handled globally by ProfileOverview via storeError
  };

  // Reset local settings to match the store
  const handleResetSettings = () => {
    if (storeSettings) {
      setLocalSettings(storeSettings);
    }
    setHasChanges(false);
    setSuccess(null);
    // clearError(); // Let global display handle storeError
  };

  // Handle Logout
  const handleLogout = async () => {
      console.log("Logout button clicked");
      try {
          clearUserState(); // Clear Zustand state first
          await signOut({ callbackUrl: '/', redirect: true }); // Use NextAuth signOut
          // Redirect handled by signOut
          console.log("signOut initiated...");
      } catch (err) {
          console.error('Logout error:', err);
          // Potentially show an error message to the user
      }
  };

  // --- Render Logic ---

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Show loading skeleton only if initial fetch is happening */}
        {isLoading && !storeSettings ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-kalos-border rounded w-full"></div>
            <div className="h-10 bg-kalos-border rounded w-full"></div>
            <div className="h-10 bg-kalos-border rounded w-full"></div>
          </div>
        ) : (
          // Render form content once initial settings are loaded (or if loading fails)
          <div className="space-y-6">
            {/* Success message specific to settings save */}
            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            {/* Global error is displayed in ProfileOverview */}

            {/* Measurement Units */}
            <DetailExpander
              title="Measurement Units"
              description="Preferred units for weight and length"
              defaultExpanded={true}
            >
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weight Unit */}
                  <div>
                    <label className="block text-sm font-medium text-kalos-text mb-1">
                      Weight Unit
                    </label>
                    <Select
                      // Use localSettings for value, fallback to store or default
                      value={localSettings.weightUnit ?? storeSettings?.weightUnit ?? 'kg'}
                      onValueChange={(value) => handleSettingChange('weightUnit', value)}
                      disabled={isUpdating} // Disable while saving
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Length Unit */}
                  <div>
                    <label className="block text-sm font-medium text-kalos-text mb-1">
                      Length Unit
                    </label>
                    <Select
                      value={localSettings.lengthUnit ?? storeSettings?.lengthUnit ?? 'cm'}
                      onValueChange={(value) => handleSettingChange('lengthUnit', value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">Centimeters (cm)</SelectItem>
                        <SelectItem value="in">Inches (in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </DetailExpander>

            {/* Appearance Settings */}
            <DetailExpander
              title="Appearance"
              description="Customize the app's theme"
              defaultExpanded={false} // Keep closed by default
            >
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-kalos-text mb-1">
                    Theme
                  </label>
                  <Select
                    value={localSettings.theme ?? storeSettings?.theme ?? 'system'}
                    onValueChange={(value) => handleSettingChange('theme', value as IUserSettings['theme'])}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DetailExpander>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 border-t border-kalos-border pt-6">
                {/* Logout Button */}
                 <button
                   type="button"
                   onClick={handleLogout}
                   className="w-full sm:w-auto px-4 py-2 border border-red-500 text-red-500 rounded-md text-sm font-medium hover:bg-red-50 flex items-center justify-center"
                 >
                   <LogOut className="w-4 h-4 mr-2" />
                   Logout
                 </button>

                {/* Save/Cancel Buttons */}
                <div className="flex space-x-4 w-full sm:w-auto justify-end">
                     <button
                       type="button"
                       onClick={handleResetSettings}
                       disabled={!hasChanges || isUpdating} // Disable if no changes or saving
                       className={`px-4 py-2 border border-kalos-border rounded-md text-sm font-medium ${!hasChanges || isUpdating ? 'opacity-50 cursor-not-allowed text-kalos-muted' : 'text-kalos-text hover:bg-kalos-highlight'}`}
                     >
                       Cancel
                     </button>
                     <button
                       type="button"
                       onClick={handleSaveSettings}
                       disabled={!hasChanges || isUpdating} // Disable if no changes or saving
                       className={`px-4 py-2 rounded-md text-sm font-medium text-white min-w-[100px] ${!hasChanges || isUpdating ? 'bg-kalos-muted cursor-not-allowed' : 'bg-kalos-text hover:bg-kalos-darkText'}`}
                     >
                       {isUpdating ? 'Saving...' : 'Save Changes'}
                     </button>
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;