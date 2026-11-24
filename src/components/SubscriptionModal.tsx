import React from 'react';
import { SubscriptionView } from './SubscriptionView';
import type { User } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubscriptionUpdated: (updatedUser: User) => void;
  initialReason?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = (props) => {
  return <SubscriptionView {...props} />;
};

