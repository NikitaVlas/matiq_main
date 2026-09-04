import { describe, expect, it, vi } from 'vitest';
import {
  RenewalCancellationService,
  type RenewalOperation,
} from '../src/billing/renewal-cancellation.js';

function fixture(providerSubscriptionId: string | null = 'synthetic-provider-id') {
  const operation: RenewalOperation = {
    id: 'op',
    subscriptionId: 'sub',
    leaseToken: 'lease',
    providerSubscriptionId,
  };
  const store = {
    claim: vi.fn().mockResolvedValue(operation),
    confirm: vi.fn().mockResolvedValue(true),
    retry: vi.fn(),
  };
  const provider = { isRenewalDisabled: vi.fn().mockResolvedValue(false), disableRenewal: vi.fn() };
  return { operation, store, provider, service: new RenewalCancellationService(store, provider) };
}

describe('durable renewal cancellation', () => {
  it('confirms only after remote state verification', async () => {
    const { service, store, provider } = fixture();
    provider.isRenewalDisabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(service.process('op')).resolves.toBe('CONFIRMED');
    expect(provider.disableRenewal).toHaveBeenCalledWith('synthetic-provider-id', 'op');
    expect(store.confirm).toHaveBeenCalledOnce();
  });
  it('reconciles an earlier success without sending cancellation twice', async () => {
    const { service, provider } = fixture();
    provider.isRenewalDisabled.mockResolvedValue(true);
    await service.process('op');
    expect(provider.disableRenewal).not.toHaveBeenCalled();
  });
  it('does not claim success merely because a provider accepted a request', async () => {
    const { service, store } = fixture();
    await expect(service.process('op')).rejects.toThrow('RENEWAL_RECONCILIATION_PENDING');
    expect(store.confirm).not.toHaveBeenCalled();
    expect(store.retry).toHaveBeenCalledOnce();
  });
  it('fails closed with no provider and does not expose provider errors', async () => {
    const { store, provider, service } = fixture();
    await expect(new RenewalCancellationService(store).process('op')).rejects.toThrow(
      'RENEWAL_RECONCILIATION_PENDING',
    );
    provider.isRenewalDisabled.mockRejectedValue(new Error('private@example.invalid'));
    await expect(service.process('op')).rejects.toThrow('RENEWAL_RECONCILIATION_PENDING');
    expect(store.confirm).not.toHaveBeenCalled();
  });
  it('handles a local subscription without remote calls', async () => {
    const { store, provider, service } = fixture(null);
    await expect(service.process('op')).resolves.toBe('CONFIRMED');
    expect(provider.isRenewalDisabled).not.toHaveBeenCalled();
    expect(store.confirm).toHaveBeenCalledOnce();
  });
  it('does not run an operation claimed elsewhere or already completed', async () => {
    const { store, service, provider } = fixture();
    store.claim.mockResolvedValue(null);
    await expect(service.process('op')).resolves.toBe('NOT_CLAIMED');
    expect(provider.isRenewalDisabled).not.toHaveBeenCalled();
  });
  it('rejects a stale claim even after provider confirmation', async () => {
    const { store, service, provider } = fixture();
    provider.isRenewalDisabled.mockResolvedValue(true);
    store.confirm.mockResolvedValue(false);
    await expect(service.process('op')).rejects.toThrow('RENEWAL_RECONCILIATION_PENDING');
  });
});
