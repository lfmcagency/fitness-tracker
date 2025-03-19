'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DetailExpander } from '@/components/shared';

interface ProfileSettingsProps {
  onSaved?: () => void;
}

// Settings interfaces
interface UserSettings {
  weightUnit: 'kg' | 'lbs';
  lengthUnit: 'cm' | 'in';
  theme: 'light' | 'dark' | 'system';
}

// Mock initial settings - in a real implementation, these would be fetched
const defaultSettings: UserSettings = {
  weightUnit: 'kg',
  lengthUnit: 'cm',
  theme: 'light',
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSaved }) => {
  const { user } = useAuth();
  
  // State for settings
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if settings have changed
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
  
  // Fetch user settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/user/settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        
        const data = await response.json();
        
        if (data.success && data.data?.settings) {
          const fetchedSettings = {
            weightUnit: data.data.settings.weightUnit || defaultSettings.weightUnit,
            lengthUnit: data.data.settings.lengthUnit || defaultSettings.lengthUnit,
            theme: data.data.settings.theme || defaultSettings.theme,
          };
          
          setSettings(fetchedSettings);
          setOriginalSettings(fetchedSettings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Could not load settings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [user]);
  
  // Handle settings change
  const handleSettingChange = (setting: keyof UserSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
    
    // Clear any previous success message when settings are changed
    if (success) {
      setSuccess(null);
    }
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save settings');
      }
      
      setOriginalSettings(settings);
      setSuccess('Settings saved successfully');
      
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Reset settings to last saved state
  const handleResetSettings = () => {
    setSettings(originalSettings);
    
    // Clear any messages
    setError(null);
    setSuccess(null);
  };
  
  return (
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-medium text-kalos-text mb-4">Profile Settings</h2>
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-kalos-border rounded"></div>
          <div className="h-10 bg-kalos-border rounded"></div>
          <div className="h-10 bg-kalos-border rounded"></div>
        </div>
      ) : (
        <>
          {/* Notifications */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}
          
          {/* Measurement Units */}
          <DetailExpander
            title="Measurement Units"
            description="Set your preferred units for weight and length measurements"
            defaultExpanded={true}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kalos-text">
                    Weight Unit
                  </label>
                  <Select 
                    value={settings.weightUnit}
                    onValueChange={(value) => handleSettingChange('weightUnit', value)}
                  >
                    <SelectTrigger className="bg-transparent border-kalos-border focus:ring-kalos-text">
                      <SelectValue placeholder="Select weight unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-kalos-bg border-kalos-border">
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kalos-text">
                    Length Unit
                  </label>
                  <Select 
                    value={settings.lengthUnit}
                    onValueChange={(value) => handleSettingChange('lengthUnit', value)}
                  >
                    <SelectTrigger className="bg-transparent border-kalos-border focus:ring-kalos-text">
                      <SelectValue placeholder="Select length unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-kalos-bg border-kalos-border">
                      <SelectItem value="cm">Centimeters (cm)</SelectItem>
                      <SelectItem value="in">Inches (in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <p className="text-xs text-kalos-muted">
                These units will be used throughout the app for displaying measurements and workout data.
              </p>
            </div>
          </DetailExpander>
          
          {/* Appearance Settings */}
          <DetailExpander
            title="Appearance"
            description="Customize the app's theme"
            defaultExpanded={true}
            className="mt-4"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-kalos-text">
                  Theme
                </label>
                <Select 
                  value={settings.theme}
                  onValueChange={(value) => handleSettingChange('theme', value as 'light' | 'dark' | 'system')}
                >
                  <SelectTrigger className="bg-transparent border-kalos-border focus:ring-kalos-text">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-kalos-bg border-kalos-border">
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                
                <p className="text-xs text-kalos-muted mt-2">
                  Choose how the app appears to you. "System" will automatically match your device's theme.
                </p>
              </div>
            </div>
          </DetailExpander>
          
          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleResetSettings}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 border border-kalos-border rounded-md text-sm font-medium 
                ${
                  !hasChanges || isSaving
                    ? 'opacity-50 cursor-not-allowed text-kalos-muted'
                    : 'text-kalos-text hover:bg-kalos-highlight'
                }`}
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white
                ${
                  !hasChanges || isSaving
                    ? 'bg-kalos-muted cursor-not-allowed'
                    : 'bg-kalos-text hover:bg-kalos-darkText'
                }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileSettings;