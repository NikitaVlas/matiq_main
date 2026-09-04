export type RenewalOperation = {
  id: string;
  subscriptionId: string;
  providerSubscriptionId: string | null;
  leaseToken: string;
};

export interface RenewalProvider {
  /** Must confirm remote state, not merely local intent. */
  isRenewalDisabled(providerSubscriptionId: string): Promise<boolean>;
  disableRenewal(providerSubscriptionId: string, operationId: string): Promise<void>;
}

export interface RenewalOperationStore {
  claim(id: string): Promise<RenewalOperation | null>;
  confirm(operation: RenewalOperation): Promise<boolean>;
  retry(operation: RenewalOperation): Promise<void>;
}

export class RenewalCancellationService {
  constructor(
    private readonly store: RenewalOperationStore,
    private readonly provider?: RenewalProvider,
  ) {}

  async process(id: string): Promise<'CONFIRMED' | 'NOT_CLAIMED'> {
    if (!id || id.length > 200) throw new Error('INVALID_RENEWAL_OPERATION');
    const operation = await this.store.claim(id);
    if (!operation) return 'NOT_CLAIMED';
    try {
      if (operation.providerSubscriptionId) {
        if (!this.provider) throw new Error('BILLING_PROVIDER_UNAVAILABLE');
        if (!(await this.provider.isRenewalDisabled(operation.providerSubscriptionId))) {
          await this.provider.disableRenewal(operation.providerSubscriptionId, operation.id);
          if (!(await this.provider.isRenewalDisabled(operation.providerSubscriptionId))) {
            throw new Error('RENEWAL_NOT_CONFIRMED');
          }
        }
      }
      if (!(await this.store.confirm(operation))) throw new Error('RENEWAL_CLAIM_LOST');
      return 'CONFIRMED';
    } catch {
      await this.store.retry(operation);
      // Provider errors may contain personal data; never propagate them to job logs.
      throw new Error('RENEWAL_RECONCILIATION_PENDING');
    }
  }
}
