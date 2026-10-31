export const ORDER_STATUSES = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'] as const;

// Unknown and cancelled states must never imply fulfillment progress.
export function orderProgressIndex(status: string): number {
  const index = ORDER_STATUSES.findIndex(value => value === status);
  return index >= 0 && index < 4 ? index : -1;
}
