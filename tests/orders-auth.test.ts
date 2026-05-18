import { beforeEach, describe, expect, it, vi } from 'vitest';

const createOrderInDbMock = vi.fn();
const getOrdersFromDbMock = vi.fn();
const requirePermissionMock = vi.fn();
const requireUserMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  requirePermission: requirePermissionMock,
  requireUser: requireUserMock,
}));

vi.mock('@/lib/data/orders', () => ({
  createOrderInDb: createOrderInDbMock,
  getOrdersFromDb: getOrdersFromDbMock,
  updateOrderStatusInDb: vi.fn(),
}));

vi.mock('@/lib/data/store', () => ({
  getStoreConfigFromDb: vi.fn(async () => ({ taxRate: 12, isEInvoicingEnabled: false })),
}));

vi.mock('@/lib/data/activity', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/email.server', () => ({ sendOrderConfirmationEmail: vi.fn(), sendOrderStatusUpdateEmail: vi.fn() }));
vi.mock('@/lib/data/users', () => ({ getUserById: vi.fn() }));
vi.mock('@/lib/db.server', () => ({ query: vi.fn() }));
vi.mock('@/lib/actions/einvoice', () => ({ generateEInvoiceAction: vi.fn() }));
vi.mock('@/lib/data/products', () => ({ getProductsFromDb: vi.fn(async () => []) }));
vi.mock('@/lib/einvoice/ride', () => ({ generateRidePdf: vi.fn(async () => Buffer.from('pdf')) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('orders authorization integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters regular users to their own orders', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1', role: 'user', permissions: {} });
    getOrdersFromDbMock.mockResolvedValue([
      { id: 'order-1', userId: 'user-1' },
      { id: 'order-2', userId: 'user-2' },
    ]);

    const { getOrdersAction } = await import('@/lib/actions/orders');
    const result = await getOrdersAction();

    expect(result.success).toBe(true);
    expect(result.orders).toEqual([{ id: 'order-1', userId: 'user-1' }]);
  });

  it('allows order managers to see all orders', async () => {
    requireUserMock.mockResolvedValue({ id: 'admin-1', role: 'admin', permissions: { manage_orders: true } });
    const orders = [
      { id: 'order-1', userId: 'user-1' },
      { id: 'order-2', userId: 'user-2' },
    ];
    getOrdersFromDbMock.mockResolvedValue(orders);

    const { getOrdersAction } = await import('@/lib/actions/orders');
    const result = await getOrdersAction();

    expect(result.success).toBe(true);
    expect(result.orders).toEqual(orders);
  });

  it('blocks direct PayPal order creation outside the PayPal flow', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1', role: 'user', permissions: {}, email: 'u@test.com', name: 'User' });

    const { createOrderAction } = await import('@/lib/actions/orders');
    const result = await createOrderAction({
      userId: 'user-1',
      customerName: 'User',
      email: 'u@test.com',
      paymentMethod: 'PayPal',
    }, [], 12);

    expect(result.success).toBe(false);
    expect(result.message).toContain('flujo seguro de PayPal');
    expect(createOrderInDbMock).not.toHaveBeenCalled();
  });
});
