export function nonNegativeNumber(value, label, whole = false) {
  if (value === null || value === undefined || String(value).trim() === '' || typeof value === 'boolean') {
    throw new Error(`${label} is required.`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || (whole && !Number.isSafeInteger(number))) {
    throw new Error(`${label} must be a finite ${whole ? 'whole number' : 'number'} of zero or more.`)
  }
  return number
}

export function validateProductForm(form) {
  if (!form.name?.trim()) throw new Error('Product name is required.')
  const price = nonNegativeNumber(form.price, 'Selling price')
  nonNegativeNumber(form.stock, 'Stock quantity', true)
  nonNegativeNumber(form.threshold, 'Low stock threshold', true)
  if (form.comparePrice !== '' && form.comparePrice !== null && form.comparePrice !== undefined) {
    const compare = nonNegativeNumber(form.comparePrice, 'Original price')
    if (compare > 0 && compare <= price) throw new Error('Original price must exceed the selling price.')
  }
}

export function validateSettings(settings) {
  if (!settings.shopName?.trim()) throw new Error('Shop name is required.')
  if (settings.shopEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.shopEmail.trim())) {
    throw new Error('Enter a valid shop email address.')
  }
  nonNegativeNumber(settings.lowStockThreshold, 'Low stock threshold', true)
  nonNegativeNumber(settings.standardDeliveryFee, 'Standard delivery fee')
  nonNegativeNumber(settings.storePickupFee, 'Store pickup fee')
}

// Display-only recognition rule, shared by all revenue summaries.
// Fulfillment never implies payment; cancelled/refunded/failed orders are excluded.
export function isRevenueOrder(order) {
  const status = String(order.status ?? order.order_status ?? '').trim().toLowerCase()
  const payment = String(order.payment_status ?? order.paymentStatus ?? '').trim().toLowerCase()
  return payment === 'paid' && !['cancelled', 'canceled', 'rejected'].includes(status)
}

export function assertSingleRow(data, key, expected, changes = {}) {
  if (!Array.isArray(data) || data.length !== 1 || String(data[0]?.[key]) !== String(expected)) {
    throw new Error('Expected exactly one matching row. Access may be denied or the record changed. Refresh and retry.')
  }
  for (const [field, value] of Object.entries(changes)) {
    if (field !== 'updated_at' && data[0][field] !== value) {
      throw new Error(`The database did not save the requested ${field}. Refresh and verify the record.`)
    }
  }
  return data[0]
}

export async function updateSingleRow(client, table, row, changes, key = 'id', previous = {}) {
  if (row?.[key] === null || row?.[key] === undefined || row[key] === '') throw new Error('Record ID is missing.')
  if (!Object.keys(changes).length) throw new Error('No changes were supplied.')
  let query = client.from(table).update(changes).eq(key, row[key])
  for (const [field, value] of Object.entries(previous)) {
    if (value === undefined) throw new Error('Previous value is missing. Refresh and retry.')
    query = value === null ? query.is(field, null) : query.eq(field, value)
  }
  const { data, error } = await query.select('*')
  if (error) throw new Error(error.message || 'Record could not be updated.')
  return assertSingleRow(data, key, row[key], changes)
}

export async function deleteSingleRow(client, table, row, key = 'id') {
  if (row?.[key] === null || row?.[key] === undefined || row[key] === '') throw new Error('Record ID is missing.')
  const { data, error } = await client.from(table).delete().eq(key, row[key]).select(key)
  if (error) throw new Error(error.message || 'Record could not be deleted.')
  return assertSingleRow(data, key, row[key])
}

// PostgREST's default response limit must not silently truncate admin totals.
// Small pages also tolerate a server row limit below the usual 1000 rows.
export async function readAllRows(client, table, pageSize = 100) {
  const rows = []
  try {
    for (let page = 0; page < 1000; page += 1) {
      const { data, error, count } = await client.from(table)
        .select('*', { count: 'exact' }).order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      if (!Array.isArray(data) || count === null || count === undefined) throw new Error('Complete dataset could not be verified.')
      rows.push(...data)
      if (rows.length >= count) return { data: rows, error: null }
      if (data.length !== pageSize) throw new Error('The server truncated this dataset. Totals cannot be verified; review the API row limit.')
    }
    throw new Error('Dataset exceeds the safe admin loading limit. Use a server-side report.')
  } catch (error) {
    return { data: null, error }
  }
}

export function safeDocumentUrl(request) {
  const value = request?.file_url || request?.document_url || request?.attachment_url
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch { return '' }
}

export function customerIdentityMatches(customer, order) {
  if (customer.id && order.id) return String(customer.id) === String(order.id)
  const email = (value) => String(value || '').trim().toLowerCase()
  if (email(customer.email) && email(order.email)) return email(customer.email) === email(order.email)
  const phone = (value) => String(value || '').replace(/[^0-9+]/g, '')
  return Boolean(phone(customer.phone) && phone(order.phone) && phone(customer.phone) === phone(order.phone))
}
