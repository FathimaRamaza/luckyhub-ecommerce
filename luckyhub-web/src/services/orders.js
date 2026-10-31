export const ORDER_STATUSES = Object.freeze([
  'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled',
])

export async function updateOrderFields(client, order, changes) {
  if (order?.id === undefined || order?.id === null || order.id === '') {
    throw new Error('This order has no valid ID. Refresh the order list and try again.')
  }
  const keys = Object.keys(changes)
  if (keys.length !== 1 || !['status', 'payment_status'].includes(keys[0])) {
    throw new Error('Only one order status or payment status field can be updated at a time.')
  }
  const field = keys[0]
  const allowed = field === 'status' ? ORDER_STATUSES : ['Pending', 'Paid', 'Failed', 'Refunded']
  if (!allowed.includes(changes[field])) {
    throw new Error(`Unsupported ${field} value: ${changes[field]}`)
  }
  if (order[field] === undefined || order[field] === null) {
    throw new Error(`The current ${field} is missing. Refresh the order before updating.`)
  }
  let data
  let error
  if (field === 'status') {
    const result = await client.rpc('staff_set_order_fulfillment_status', {
      p_order_id: order.id,
      p_expected_status: order.status,
      p_next_status: changes.status,
    })
    error = result.error
    // The RPC returns one JSON object, not a table result array.
    data = result.data && !Array.isArray(result.data) ? [result.data] : []
  } else {
    const result = await client.from('orders')
      .update(changes)
      .eq('id', order.id)
      .eq('payment_status', order.payment_status)
      .select('id, payment_status')
    data = result.data
    error = result.error
  }
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') throw new Error('The fulfillment RPC is not deployed or available yet. Contact an administrator; no direct status update was attempted.')
    if (error.code === '42501') throw new Error('You do not have permission to update this order. Ask an administrator to verify staff access policies.')
    if (error.code === '23514' || error.code === '22P02') throw new Error('The database rejected this status value. Verify the deployed order constraints.')
    throw new Error(error.message || 'Order could not be updated.')
  }
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error('The update could not be verified: expected exactly one order. It may have changed, been removed, or be blocked by access policies. Refresh and try again.')
  }
  if (String(data[0].id) !== String(order.id) || data[0][field] !== changes[field]) {
    throw new Error('The database response did not match the requested order update. Refresh and verify the order.')
  }
  return data[0]
}

export function getFulfillmentActions(status, role) {
  if (!['admin', 'shopkeeper'].includes(role)) return []
  const next = { Processing: 'Shipped', Shipped: 'Out for Delivery', 'Out for Delivery': 'Delivered' }[status]
  return next ? [next, ...(role === 'admin' ? ['Cancelled'] : [])] : []
}
