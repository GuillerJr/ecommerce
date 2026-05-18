import { beforeEach, describe, expect, it, vi } from 'vitest';

const attachPaypalOrderToDbMock = vi.fn();
const createOrderInDbMock = vi.fn();
const getOrderByIdFromDbMock = vi.fn();
const markPaypalOrderCapturedInDbMock = vi.fn();
const updateOrderStatusInDbMock = vi.fn();
const requireUserMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientRateLimitKey: vi.fn(async (scope: string, id: string) => `${scope}:${id}`),
}));
vi.mock('@/lib/data/store', () => ({
  getStoreConfigFromDb: vi.fn(async () => ({ taxRate: 12, currency: { code: 'USD' } })),
}));
vi.mock('@/lib/data/orders', () => ({
  attachPaypalOrderToDb: attachPaypalOrderToDbMock,
  createOrderInDb: createOrderInDbMock,
  getOrderByIdFromDb: getOrderByIdFromDbMock,
  markPaypalOrderCapturedInDb: markPaypalOrderCapturedInDbMock,
  updateOrderStatusInDb: updateOrderStatusInDbMock,
}));
vi.mock('@/lib/actions/orders', () => ({ finalizeOrderAfterPayment: vi.fn() }));

describe('PayPal checkout integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYPAL_CLIENT_ID = 'client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'client-secret';
    process.env.PAYPAL_API_BASE = 'https://paypal.test';
    global.fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/v1/oauth2/token')) {
        return Response.json({ access_token: 'access-token' });
      }
      if (url.endsWith('/v2/checkout/orders')) {
        return Response.json({ id: 'PAYPAL-ORDER-1' });
      }
      return Response.json({
        status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1', status: 'COMPLETED', amount: { value: '42.50', currency_code: 'USD' } }] } }],
      });
    }) as typeof fetch;
  });

  it('creates a pending local order before returning a PayPal order id', async () => {
    requireUserMock.mockResolvedValue({
      id: 'user-1',
      name: 'User',
      email: 'u@test.com',
      identification: '123',
      addresses: [{ id: 'addr-1', name: 'Casa', address: 'Street', city: 'Quito', postalCode: '1701', country: 'EC' }],
    });
    createOrderInDbMock.mockResolvedValue({ id: 'order-1', total: 42.5 });

    const { createPaypalOrderAction } = await import('@/lib/actions/paypal');
    const result = await createPaypalOrderAction([], 'SAVE10', 'addr-1');

    expect(result).toEqual({ success: true, orderId: 'PAYPAL-ORDER-1', internalOrderId: 'order-1' });
    expect(createOrderInDbMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', paymentMethod: 'PayPal' }), [], 12, 'SAVE10');
    expect(attachPaypalOrderToDbMock).toHaveBeenCalledWith('order-1', 'PAYPAL-ORDER-1', 'USD');
  });

  it('rejects PayPal creation with an address not owned by the user', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1', addresses: [{ id: 'addr-1' }] });

    const { createPaypalOrderAction } = await import('@/lib/actions/paypal');
    const result = await createPaypalOrderAction([], undefined, 'addr-2');

    expect(result.success).toBe(false);
    expect(result.message).toContain('no pertenece');
    expect(createOrderInDbMock).not.toHaveBeenCalled();
  });

  it('validates ownership and records capture amount, currency and transaction id', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1' });
    getOrderByIdFromDbMock.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      paymentMethod: 'PayPal',
      paypalOrderId: 'PAYPAL-ORDER-1',
      total: 42.5,
    });
    markPaypalOrderCapturedInDbMock.mockResolvedValue({ id: 'order-1', userId: 'user-1' });

    const { capturePaypalOrderAction } = await import('@/lib/actions/paypal');
    const result = await capturePaypalOrderAction('PAYPAL-ORDER-1', 'order-1');

    expect(result.success).toBe(true);
    expect(markPaypalOrderCapturedInDbMock).toHaveBeenCalledWith('order-1', 'PAYPAL-ORDER-1', 'CAPTURE-1', 42.5, 'USD');
  });

  it('rejects capture when the pending order belongs to another user', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1' });
    getOrderByIdFromDbMock.mockResolvedValue({ id: 'order-1', userId: 'user-2' });

    const { capturePaypalOrderAction } = await import('@/lib/actions/paypal');
    const result = await capturePaypalOrderAction('PAYPAL-ORDER-1', 'order-1');

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(markPaypalOrderCapturedInDbMock).not.toHaveBeenCalled();
  });
});
