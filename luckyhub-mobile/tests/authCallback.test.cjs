const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Compile only the pure auth helper in memory; no native runtime or live account needed.
const filename = path.join(path.dirname(module.filename), '../src/lib/authCallback.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const helper = new Module(filename, module);
helper._compile(compiled.outputText, filename);
const { AuthCallbackError, parseAuthCallback, completeAuthCallback, createAuthCallbackProcessor, getValidatedSession, getAuthCallbackDiagnostics } = helper.exports;
const base = 'luckyhubmobile://auth/callback';
const link = `${base}#access_token=access&refresh_token=refresh&type=signup`;
const user = { id: 'customer-1', email_confirmed_at: '2026-01-01T00:00:00Z' };
const session = { user, access_token: 'access', refresh_token: 'refresh', expires_at: Math.floor(Date.now() / 1000) + 3600 };

function client(overrides = {}) {
  return { auth: {
    setSession: async tokens => {
      assert.equal(tokens.access_token, 'access');
      assert.equal(tokens.refresh_token, 'refresh');
      return { data: { session }, error: null };
    },
    exchangeCodeForSession: async code => {
      assert.equal(code, 'valid-code');
      return { data: { session, redirectType: null }, error: null };
    },
    verifyOtp: async input => {
      assert.deepEqual(input, { token_hash: 'recovery-hash', type: 'recovery' });
      return { data: { session }, error: null };
    },
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async token => {
      assert.equal(token, 'access');
      return { data: { user }, error: null };
    },
    ...overrides,
  } };
}

test('rejects a bare callback even when a previous session exists', async () => {
  await assert.rejects(completeAuthCallback(client(), base), /incomplete/);
});
test('rejects partial tokens and mismatched schemes', () => {
  assert.throws(() => parseAuthCallback(`${base}#access_token=access`), /incomplete/);
  assert.throws(() => parseAuthCallback('luckyhub://auth/callback?code=valid-code'), /email/);
});
test('reports Supabase expired-link errors instead of success', async () => {
  await assert.rejects(completeAuthCallback(client(), `${base}#error_code=otp_expired`), /otp_expired/);
});
test('verifies an implicit link against the server-confirmed user', async () => {
  const result = await completeAuthCallback(client(), link);
  assert.equal(result.session, session);
  assert.equal(result.recovery, false);
});
test('requires a session returned by the exchange, never falls back to an old session', async () => {
  await assert.rejects(completeAuthCallback(client({
    setSession: async () => ({ data: { session: null }, error: null }),
  }), link), /did not establish/);
});
test('rejects an unconfirmed or mismatched server user', async () => {
  for (const invalidUser of [{ id: user.id }, { ...user, id: 'other-user' }, null]) {
    await assert.rejects(completeAuthCallback(client({
      getUser: async () => ({ data: { user: invalidUser }, error: null }),
    }), link), /not been verified/);
  }
});
test('propagates token exchange and server validation failures', async () => {
  for (const method of ['setSession', 'getUser']) {
    await assert.rejects(completeAuthCallback(client({
      [method]: async () => ({ data: {}, error: new Error('invalid token') }),
    }), link), error => error instanceof AuthCallbackError && error.stage === (method === 'getUser' ? 'validation' : 'exchange'));
  }
});
test('routes implicit recovery tokens to password reset', async () => {
  const result = await completeAuthCallback(client(), link.replace('type=signup', 'type=recovery'));
  assert.equal(result.recovery, true);
});
test('supports PKCE verification and recovery metadata', async () => {
  assert.equal((await completeAuthCallback(client(), `${base}?code=valid-code`)).recovery, false);
  const recoveryClient = client({
    exchangeCodeForSession: async () => ({ data: { session, redirectType: 'recovery' }, error: null }),
  });
  assert.equal((await completeAuthCallback(recoveryClient, `${base}?code=valid-code`)).recovery, true);
});
test('restores only a matching, unexpired, server-validated session', async () => {
  assert.equal(await getValidatedSession(client()), session);
  assert.equal(await getValidatedSession(client({
    getSession: async () => ({ data: { session: null }, error: null }),
  })), null);
  assert.equal(await getValidatedSession(client({
    getSession: async () => ({ data: { session: { ...session, expires_at: 1 } }, error: null }),
  })), null);
  await assert.rejects(getValidatedSession(client({
    getUser: async () => ({ data: { user: null }, error: new Error('session revoked') }),
  })), /session revoked/);
});

test('rejects malformed callback targets before making any auth request', async () => {
  let calls = 0;
  const unexpectedCall = async () => { calls += 1; throw new Error('unexpected auth request'); };
  const untouchedClient = client({
    setSession: unexpectedCall,
    exchangeCodeForSession: unexpectedCall,
    getSession: unexpectedCall,
    getUser: unexpectedCall,
  });
  for (const url of [
    'not-a-url',
    'https://example.com/auth/callback?code=valid-code',
    'luckyhubmobile://other/callback?code=valid-code',
    'luckyhubmobile://auth/other?code=valid-code',
    `${base}#refresh_token=refresh`,
    `${base}?code=`,
  ]) {
    await assert.rejects(completeAuthCallback(untouchedClient, url));
  }
  assert.equal(calls, 0);
});

test('accepts query parameters and never displays raw redirect descriptions', async () => {
  const result = await completeAuthCallback(client(), `${base}?access_token=access&refresh_token=refresh&type=recovery`);
  assert.equal(result.recovery, true);
  await assert.rejects(completeAuthCallback(client(), `${base}#error=access_denied&error_description=SECRET_TOKEN`), error => {
    assert.equal(error.stage, 'redirect');
    assert.equal(error.code, 'provider_rejected');
    assert.ok(!error.message.includes('SECRET_TOKEN'));
    return true;
  });
});

test('app scheme, recovery request redirect and callback target remain aligned', () => {
  const root = path.join(path.dirname(module.filename), '..');
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  assert.equal(new URL(base).protocol, `${app.expo.scheme}:`);
  assert.ok(fs.readFileSync(path.join(root, 'src/lib/authRedirect.ts'), 'utf8').includes(base));
});

test('verifies recovery token hashes using verifyOtp, never PKCE or setSession', async () => {
  const unexpected = async () => { throw new Error('Wrong exchange method'); };
  const result = await completeAuthCallback(client({
    exchangeCodeForSession: unexpected, setSession: unexpected,
  }), `${base}?token_hash=recovery-hash&type=recovery`);
  assert.equal(result.recovery, true);
  assert.equal(result.session, session);
});

test('rejects missing or unsupported token-hash types and ambiguous credentials', async () => {
  for (const query of [
    'token_hash=recovery-hash',
    'token_hash=recovery-hash&type=email',
    'token_hash=recovery-hash&type=recovery&code=valid-code',
    'code=valid-code&type=recovery#type=signup',
    'code=valid-code&code=another-code',
  ]) await assert.rejects(completeAuthCallback(client(), `${base}?${query}`), error => error.stage === 'link');
});

test('distinguishes expired provider redirects from OTP exchange failure', async () => {
  await assert.rejects(completeAuthCallback(client(), `${base}#error=access_denied&error_code=otp_expired`), error =>
    error.stage === 'redirect' && error.code === 'otp_expired');
  await assert.rejects(completeAuthCallback(client({
    verifyOtp: async () => ({ data: { session: null }, error: { code: 'otp_expired', message: 'SECRET' } }),
  }), `${base}?token_hash=recovery-hash&type=recovery`), error =>
    error.stage === 'exchange' && error.code === 'otp_expired' && !error.message.includes('SECRET'));
});

test('does not label a PKCE device mismatch or network error as token expiry', async () => {
  await assert.rejects(completeAuthCallback(client({
    exchangeCodeForSession: async () => ({ data: { session: null }, error: { code: 'bad_code_verifier' } }),
  }), `${base}?code=valid-code`), error => error.code === 'pkce_exchange_failed');
  await assert.rejects(completeAuthCallback(client({
    verifyOtp: async () => { throw new Error('network error with SECRET'); },
  }), `${base}?token_hash=recovery-hash&type=recovery`), error =>
    error.code === 'provider_rejected' && error.stage === 'exchange' && !error.message.includes('SECRET'));
});

test('duplicate Android events and remounts consume a recovery link once', async () => {
  let exchanges = 0;
  const process = createAuthCallbackProcessor(client({
    verifyOtp: async () => { exchanges += 1; return { data: { session }, error: null }; },
  }));
  const recoveryLink = `${base}?token_hash=recovery-hash&type=recovery`;
  const [first, duplicate] = await Promise.all([process(recoveryLink), process(recoveryLink)]);
  assert.equal(first.recovery, true);
  assert.equal(duplicate.recovery, true);
  assert.equal((await process(`${base}#type=recovery&token_hash=recovery-hash`)).recovery, true);
  assert.equal(exchanges, 1);
});

test('duplicate callbacks cannot restore a cached recovery session after logout', async () => {
  let signedOut = false;
  let exchanges = 0;
  const process = createAuthCallbackProcessor(client({
    verifyOtp: async () => { exchanges += 1; return { data: { session }, error: null }; },
    getSession: async () => ({ data: { session: signedOut ? null : session }, error: null }),
  }));
  const recoveryLink = `${base}?token_hash=recovery-hash&type=recovery`;
  await process(recoveryLink);
  signedOut = true;
  await assert.rejects(process(recoveryLink), error => error.code === 'already_processed');
  assert.equal(exchanges, 1);
});

test('failed single-use exchanges are not automatically repeated by duplicate events', async () => {
  let exchanges = 0;
  const process = createAuthCallbackProcessor(client({
    verifyOtp: async () => { exchanges += 1; return { data: { session: null }, error: { code: 'otp_expired' } }; },
  }));
  const recoveryLink = `${base}?token_hash=recovery-hash&type=recovery`;
  await assert.rejects(process(recoveryLink), /otp_expired/);
  await assert.rejects(process(recoveryLink), /otp_expired/);
  assert.equal(exchanges, 1);
});

test('failed or sessionless PKCE exchange never uses a pre-existing session', async () => {
  for (const result of [
    { data: { session: null }, error: new Error('code already used') },
    { data: { session: null }, error: null },
  ]) {
    let readExistingSession = false;
    await assert.rejects(completeAuthCallback(client({
      exchangeCodeForSession: async () => result,
      getSession: async () => { readExistingSession = true; return { data: { session }, error: null }; },
    }), `${base}?code=valid-code`));
    assert.equal(readExistingSession, false);
  }
});

test('restoration rejects mismatched users, missing expiry, and storage errors', async () => {
  assert.equal(await getValidatedSession(client({
    getUser: async () => ({ data: { user: { ...user, id: 'other-user' } }, error: null }),
  })), null);
  assert.equal(await getValidatedSession(client({
    getSession: async () => ({ data: { session: { ...session, expires_at: undefined } }, error: null }),
  })), null);
  await assert.rejects(getValidatedSession(client({
    getSession: async () => ({ data: { session: null }, error: new Error('storage failure') }),
  })), /storage failure/);
});

test('signed-out restoration does not call the user endpoint', async () => {
  let requestedUser = false;
  assert.equal(await getValidatedSession(client({
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => { requestedUser = true; throw new Error('unexpected user request'); },
  })), null);
  assert.equal(requestedUser, false);
});

test('safe diagnostics log only parameter names and allowlisted type/error code', () => {
  const diagnostic = getAuthCallbackDiagnostics(`${base}?code=SECRET_CODE&token_hash=SECRET_HASH#access_token=SECRET_ACCESS&refresh_token=SECRET_REFRESH&type=recovery&error_code=otp_expired&error_description=SECRET_DESCRIPTION`);
  assert.deepEqual(diagnostic, {
    parameterNames: ['access_token', 'code', 'error_code', 'error_description', 'refresh_token', 'token_hash', 'type'],
    type: 'recovery', error_code: 'otp_expired',
  });
  assert.ok(!JSON.stringify(diagnostic).includes('SECRET'));
  assert.ok(!JSON.stringify(diagnostic).includes(base));
});

test('safe diagnostics redact hostile metadata values, names and malformed URLs', () => {
  const diagnostic = getAuthCallbackDiagnostics(`${base}?SECRET_NAME=SECRET_VALUE&type=SECRET_TYPE&error_code=SECRET_ERROR&password=SECRET_PASSWORD`);
  assert.equal(diagnostic.type, '(redacted)');
  assert.equal(diagnostic.error_code, '(redacted)');
  assert.ok(!JSON.stringify(diagnostic).includes('SECRET'));
  assert.deepEqual(getAuthCallbackDiagnostics('SECRET_INVALID_URL'), { parameterNames: [], type: null, error_code: null });
  assert.equal(getAuthCallbackDiagnostics(`${base}?type=recovery#type=SECRET`).type, '(ambiguous)');
});
