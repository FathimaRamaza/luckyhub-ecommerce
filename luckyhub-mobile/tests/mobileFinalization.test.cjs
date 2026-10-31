const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, client) {
  const filename = path.join(path.dirname(module.filename), relative);
  const helper = new Module(filename, module);
  helper.require = name => name === '../lib/supabase' ? { supabase: client } : require(name);
  helper._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return helper.exports;
}

const { orderProgressIndex } = load('../src/lib/orderStatus.ts');
test('exact database statuses map to fulfillment progress', () => {
  ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'].forEach((status, index) => {
    assert.equal(orderProgressIndex(status), index);
  });
});
test('cancelled, missing and legacy statuses never imply completed progress', () => {
  for (const status of ['Cancelled', '', 'confirmed', 'ready', 'Unexpected']) {
    assert.equal(orderProgressIndex(status), -1);
  }
});

function fixture(user, error = null) {
  const calls = [];
  const query = { then(resolve) { return Promise.resolve({ data: [], error }).then(resolve); } };
  for (const method of ['select', 'eq', 'order', 'limit', 'update', 'maybeSingle']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: table => { calls.push(['from', table]); return query; },
  };
  return { calls, service: load('../src/services/customerNotificationService.ts', client) };
}
test('notification reads and read receipts are scoped to authenticated owner', async () => {
  const { calls, service } = fixture({ id: 'customer-a' });
  await service.getCustomerNotifications();
  await service.markCustomerNotificationRead('notification-a');
  assert.equal(calls.filter(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'customer-a').length, 2);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === 'notification-a'));
  const update = calls.find(call => call[0] === 'update')[1];
  assert.deepEqual(Object.keys(update), ['read_at']);
});
test('signed out notification access stops before database query', async () => {
  const { calls, service } = fixture(null);
  await assert.rejects(service.getCustomerNotifications());
  await assert.rejects(service.markCustomerNotificationRead('notification-a'));
  assert.deepEqual(calls, []);
});
test('notification backend errors are not presented as an empty inbox or success', async () => {
  const { service } = fixture({ id: 'customer-a' }, { message: 'private backend detail' });
  await assert.rejects(service.getCustomerNotifications(), /Unable to load notifications/);
  await assert.rejects(service.markCustomerNotificationRead('notification-a'), /Unable to mark/);
});
