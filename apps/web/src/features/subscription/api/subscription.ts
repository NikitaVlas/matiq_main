import { userApi } from '../../../shared/api/client';
import type { SubscriptionAccess } from '../../../entities/subscription/model/types';

export const getSubscription = () => userApi<SubscriptionAccess>('/subscription');
export const activateTrial = () => userApi('/subscription/activate-trial', { method: 'POST' });
export const cancelSubscription = () => userApi('/subscription/cancel', { method: 'POST' });
