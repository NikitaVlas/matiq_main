export type SubscriptionAccess = {
  status: 'NONE' | 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  hasAccess: boolean;
  endsAt?: string;
};
