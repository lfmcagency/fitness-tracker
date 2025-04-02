// src/components/profile/ProfileSettings.tsx
// Previous rewrite seems largely correct based on cleaned types.
// Ensure imports and store interactions match the revised store.
'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { IUserSettings } from '@/types/models/user'; // Use the clean model type
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DetailExpander } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSettings: React.FC = () => {
  // Select state and actions from store
  const { storeSettings, isLoading, isUpdating, storeError, updateSettings, clearError } = useUserStore(state => ({
      storeSettings: state.settings,
      isLoading: state.isLoadingSettings, // Loading for initial fetch
      isUpdating: state.isUpdatingSettings, // Loading for PUT request
      storeError: state.error,
      updateSettings: state.updateSettings,
      clearError: state.clearError
  }));

  const [localSettings, setLocalSettings] = useState<Partial<IUserSettings>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (storeSettings) {
      setLocalSettings(storeSettings);
      setHasChanges(false);
    }
  }, [storeSettings]);

  const handleSettingChange = (setting: keyof IUserSettings, value: string) => {
    setLocalSettings((prev) => {
      const newSettings = { ...prev, [setting]: value };
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(storeSettings || {}));
      return newSettings;
    });
    setSuccess(null);
    clearError();
  };

  const handleSaveSettings = async () => {
    if (!hasChanges || !storeSettings) return;
    setSuccess(null); // Clear previous success message
    const success = await updateSettings(localSettings);
    if (success) {
      setSuccess('Settings saved successfully');
      setHasChanges(false);
    } // Error is handled by global storeError display
  };

  const handleResetSettings = () => { /* ... keep existing logic ... */ };
  const handleLogout = async () => { /* ... keep existing logic ... */ };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Profile Settings</CardTitle></CardHeader>
      <CardContent>
        {isLoading && !storeSettings ? (
            <div className="animate-pulse space-y-4"> {/* Loading Skeleton */}
                <div className="h-10 bg-kalos-border rounded w-full"></div>
                <div className="h-10 bg-kalos-border rounded w-full"></div>
            </div>
        ) : (
          <div className="space-y-6">
            {/* Use Global Error from ProfileOverview OR local if preferred */}
            {/* {storeError && <Alert variant="destructive">...</Alert>} */}
            {success && <Alert className="border-green-500 bg-green-50 text-green-700"><CheckCircle className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}

            {/* Measurement Units Expander */}
            <DetailExpander title="Measurement Units" description="..." defaultExpanded={true}>
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Weight Unit Select */}
                        <div>
                            <label className="block text-sm font-medium text-kalos-text mb-1">Weight Unit</label>
                            <Select value={localSettings.weightUnit || 'kg'} onValueChange={(v) => handleSettingChange('weightUnit', v)} disabled={isUpdating}>
                                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                                <SelectContent><SelectItem value="kg">Kilograms (kg)</SelectItem><SelectItem value="lbs">Pounds (lbs)</SelectItem></SelectContent>
                            </Select>
                        </div>
                        {/* Length Unit Select */}
                        <div>
                            <label className="block text-sm font-medium text-kalos-text mb-1">Length Unit</label>
                             <Select value={localSettings.lengthUnit || 'cm'} onValueChange={(v) => handleSettingChange('lengthUnit', v)} disabled={isUpdating}>
                                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                                <SelectContent><SelectItem value="cm">Centimeters (cm)</SelectItem><SelectItem value="in">Inches (in)</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </DetailExpander>

            {/* Appearance Expander */}
            <DetailExpander title="Appearance" description="..." defaultExpanded={false}>
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-medium text-kalos-text mb-1">Theme</label>
                        <Select value={localSettings.theme || 'system'} onValueChange={(v) => handleSettingChange('theme', v)} disabled={isUpdating}>
                             <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                            <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            </DetailExpander>

            {/* Action Buttons Section */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 border-t border-kalos-border pt-6">
                {/* Logout Button */}
                <button type="button" onClick={handleLogout} className="w-full sm:w-auto px-4 py-2 border border-red-500 text-red-500 rounded-md text-sm font-medium hover:bg-red-50 flex items-center justify-center">
                    <LogOut className="w-4 h-4 mr-2" />Logout
                </button>
                {/* Save/Cancel */}
                <div className="flex space-x-4 w-full sm:w-auto justify-end">
                    <button type="button" onClick={handleResetSettings} disabled={!hasChanges || isUpdating} className={`px-4 py-2 border border-kalos-border rounded-md text-sm font-medium ${!hasChanges || isUpdating ? 'opacity-50 cursor-not-allowed text-kalos-muted' : 'text-kalos-text hover:bg-kalos-highlight'}`}>Cancel</button>
                    <button type="button" onClick={handleSaveSettings} disabled={!hasChanges || isUpdating} className={`px-4 py-2 rounded-md text-sm font-medium text-white min-w-[100px] ${!hasChanges || isUpdating ? 'bg-kalos-muted cursor-not-allowed' : 'bg-kalos-text hover:bg-kalos-darkText'}`}>{isUpdating ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;