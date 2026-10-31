import test from 'node:test'
import assert from 'node:assert/strict'
import { ORDER_STATUSES, updateOrderFields } from '../src/services/orders.js'

function mock(result) {
  const calls = []
  const query = {
    update(value) { calls.push(['update', value]); return this },
    eq(key, value) { calls.push(['eq', key, value]); return this },
    select(value) { calls.push(['select', value]); return Promise.resolve(result) },
  }
  return { calls, from(table) { calls.push(['from', table]); return query }, rpc(name, args) { calls.push(['rpc', name, args]); return Promise.resolve(result) } }
}
const order = { id: 'test-only', status: 'Processing', payment_status: 'Pending' }
for (const status of ORDER_STATUSES) {
  test(`accepts exact status ${status}`, async () => {
    const client = mock({ data: { id: order.id, status } })
    await updateOrderFields(client, order, { status })
    assert.deepEqual(client.calls, [['rpc', 'staff_set_order_fulfillment_status', { p_order_id: order.id, p_expected_status: 'Processing', p_next_status: status }]])
  })
}
for (const status of ['shipped', 'Completed', 'completed']) {
  test(`rejects unsupported status ${status} before querying`, async () => {
    const client = mock({})
    await assert.rejects(updateOrderFields(client, order, { status }), /Unsupported/)
    assert.equal(client.calls.length, 0)
  })
}
for (const data of [[], null, [{ id: order.id, status: 'Shipped' }, { id: 'other', status: 'Shipped' }]]) {
  test(`rejects unverified row count ${JSON.stringify(data)}`, async () => {
    await assert.rejects(updateOrderFields(mock({ data }), order, { status: 'Shipped' }), /exactly one/)
  })
}
for (const row of [{ id: 'other', status: 'Shipped' }, { id: order.id, status: 'Processing' }]) {
  test(`rejects mismatched returned row ${JSON.stringify(row)}`, async () => {
    await assert.rejects(updateOrderFields(mock({ data: row }), order, { status: 'Shipped' }), /did not match/)
  })
}
for (const [code, message] of [['42501', 'permission'], ['23514', 'rejected'], ['22P02', 'rejected'], ['other', 'network failed']]) {
  test(`reports database error ${code}`, async () => {
    await assert.rejects(updateOrderFields(mock({ error: { code, message: 'network failed' } }), order, { status: 'Shipped' }), new RegExp(message))
  })
}
test('payment update stays separate and uses Paid', async () => {
  const client = mock({ data: [{ id: order.id, payment_status: 'Paid' }] })
  await updateOrderFields(client, order, { payment_status: 'Paid' })
  assert.deepEqual(client.calls[1], ['update', { payment_status: 'Paid' }])
})
test('rejects missing ID, missing previous status, and unexpected fields', async () => {
  for (const [row, changes] of [[{}, { status: 'Shipped' }], [{ id: 'x' }, { status: 'Shipped' }], [order, { status: 'Shipped', payment_status: 'Paid' }], [order, { customer_name: 'changed' }]]) {
    const client = mock({})
    await assert.rejects(updateOrderFields(client, row, changes))
    assert.equal(client.calls.length, 0)
  }
})

test('does not fall back to direct status updates when RPC is missing', async () => {
  const client = mock({ error: { code: 'PGRST202' } })
  await assert.rejects(updateOrderFields(client, order, { status: 'Shipped' }), /not deployed/)
  assert.equal(client.calls.length, 1)
  assert.equal(client.calls[0][0], 'rpc')
})
test('preserves RPC transition and concurrency error messages', async () => {
  for (const message of ['This fulfillment status transition is not allowed.', 'Order status changed. Refresh before trying again.']) {
    await assert.rejects(updateOrderFields(mock({ error: { code: 'P0001', message } }), order, { status: 'Shipped' }), { message })
  }
})
