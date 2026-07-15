'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { UserService } from '@/lib/services/UserService';
import { UserProfileData } from '@/lib/repositories/UserRepository';

interface ProfileContextType {
  profile: UserProfileData | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfileData>) => Promise<void>;
  reloadProfile: () => Promise<void>;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const loadProfile = async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await UserService.getProfile(user.uid);
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user, isAuthenticated, authLoading]);

  const updateProfile = async (updates: Partial<UserProfileData>) => {
    if (!user?.uid) return;
    const newProfile = { ...(profile as UserProfileData), ...updates };
    setProfile(newProfile); // optimistic update
    try {
      await UserService.saveProfile(user.uid, updates);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile.');
      // rollback
      setProfile(profile);
    }
  };

  return (
    <ProfileContext.Provider value={{ 
      profile, isLoading: isLoading || authLoading, error, updateProfile, reloadProfile: loadProfile,
      isUpgradeModalOpen, openUpgradeModal: () => setIsUpgradeModalOpen(true), closeUpgradeModal: () => setIsUpgradeModalOpen(false)
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
