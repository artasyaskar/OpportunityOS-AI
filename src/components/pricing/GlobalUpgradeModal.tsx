'use client';

import React from 'react';
import { useProfile } from '@/components/auth/ProfileContext';
import UpgradeModal from './UpgradeModal';

export function GlobalUpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal } = useProfile();
  return <UpgradeModal isOpen={isUpgradeModalOpen} onClose={closeUpgradeModal} />;
}
