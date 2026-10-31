import type { Session, SupabaseClient } from '@supabase/supabase-js';

type AuthClient = Pick<SupabaseClient, 'auth'>;

type CallbackStage = 'link' | 'redirect' | 'exchange' | 'validation';

export function getAuthCallbackDiagnostics(url: string) {
  // Allowlist even names and metadata values so a malformed link cannot log secrets.
  const names = new Set(['access_token', 'refresh_token', 'token_hash', 'token', 'code',
    'type', 'error', 'error_code', 'error_description', 'expires_in', 'expires_at',
    'token_type', 'redirect_to', 'provider_token', 'provider_refresh_token']);
  const types = new Set(['recovery', 'signup', 'email', 'magiclink', 'invite', 'email_change']);
  const codes = new Set(['otp_expired', 'access_denied', 'bad_code_verifier',
    'flow_state_not_found', 'flow_state_expired', 'validation_failed', 'invalid_token',
    'session_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'unexpected_failure']);
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => params.append(key, value));
    const safeValue = (key: string, allowed: Set<string>) => {
      const values = params.getAll(key);
      if (values.length === 0) return null;
      if (values.length !== 1) return '(ambiguous)';
      return allowed.has(values[0]) ? values[0] : '(redacted)';
    };
    return {
      parameterNames: [...new Set([...params.keys()].map(key => names.has(key) ? key : '(unknown parameter)'))].sort(),
      type: safeValue('type', types),
      error_code: safeValue('error_code', codes),
    };
  } catch {
    return { parameterNames: [], type: null, error_code: null };
  }
}

export class AuthCallbackError extends Error {
  constructor(readonly stage: CallbackStage, readonly code: string, message: string) {
    super(`${message} [${stage}/${code}]`);
    this.name = 'AuthCallbackError';
  }
}

function providerError(stage: 'redirect' | 'exchange' | 'validation', error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (code === 'otp_expired') {
    return new AuthCallbackError(stage, 'otp_expired', 'Supabase rejected this email link as expired or already used. Please request a new email and open the newest link once.');
  }
  if (code === 'flow_state_not_found' || code === 'flow_state_expired' || code === 'bad_code_verifier') {
    return new AuthCallbackError(stage, 'pkce_exchange_failed', 'The email code could not be exchanged on this device. Request a new link from this app and open it on the same device.');
  }
  // Never display provider messages or URL descriptions: they may contain credentials.
  return new AuthCallbackError(stage, 'provider_rejected', stage === 'redirect'
    ? 'Supabase rejected the email link before the app could establish a session. Please request a new email.'
    : 'Unable to complete the Supabase session check. Check your connection and request a new email if the problem persists.');
}

export function parseAuthCallback(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    throw new AuthCallbackError('link', 'invalid_url', 'This is not a valid email callback link.');
  }
  if (parsed.protocol !== 'luckyhubmobile:' ||
      parsed.hostname !== 'auth' || parsed.pathname !== '/callback' ||
      parsed.username || parsed.password || parsed.port) {
    throw new AuthCallbackError('link', 'wrong_target', 'Please open the verification or password reset link from your email.');
  }
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => params.append(key, value));
  if (params.has('error') || params.has('error_code') || params.has('error_description')) {
    throw providerError('redirect', { code: params.get('error_code') });
  }
  for (const key of ['access_token', 'refresh_token', 'code', 'token_hash', 'type']) {
    if (params.getAll(key).length > 1) {
      throw new AuthCallbackError('link', 'ambiguous_parameters', 'This email link contains conflicting parameters. Please request a new email.');
    }
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if ((accessToken && !refreshToken) || (!accessToken && refreshToken)) {
    throw new AuthCallbackError('link', 'incomplete_tokens', 'This email link is incomplete. Please request a new email.');
  }
  if (Number(Boolean(accessToken && refreshToken)) + Number(Boolean(code)) + Number(Boolean(tokenHash)) !== 1) {
    throw new AuthCallbackError('link', 'invalid_credentials', 'This email link is incomplete or ambiguous. Please request a new email.');
  }
  if (tokenHash && type !== 'recovery') {
    throw new AuthCallbackError('link', 'unsupported_type', 'This token-hash link is not a password recovery link.');
  }
  return { accessToken, refreshToken, code, tokenHash, recovery: type === 'recovery' };
}

export async function completeAuthCallback(client: AuthClient, url: string) {
  const params = parseAuthCallback(url);
  let session: Session | null;
  let recovery = params.recovery;
  try {
    if (params.tokenHash) {
      const result = await client.auth.verifyOtp({ token_hash: params.tokenHash, type: 'recovery' });
      if (result.error) throw result.error;
      session = result.data.session;
    } else if (params.accessToken && params.refreshToken) {
      const result = await client.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (result.error) throw result.error;
      session = result.data.session;
    } else {
      const result = await client.auth.exchangeCodeForSession(params.code!);
      if (result.error) throw result.error;
      session = result.data.session;
      recovery ||= 'redirectType' in result.data && result.data.redirectType === 'recovery';
    }
  } catch (error) {
    throw providerError('exchange', error);
  }
  if (!session) throw new AuthCallbackError('exchange', 'missing_session', 'The email link did not establish a session. Please request a new email.');
  let data;
  try {
    const result = await client.auth.getUser(session.access_token);
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    throw providerError('validation', error);
  }
  if (!data.user || data.user.id !== session.user.id || !data.user.email_confirmed_at) {
    throw new AuthCallbackError('validation', 'unconfirmed_user', 'Your email has not been verified. Please request a new verification email.');
  }
  return { session, recovery };
}

// Share processing across callback-route remounts and duplicate Android link events.
// Keep only the most recent exchange in memory; never persist or log the URL/tokens.
export function createAuthCallbackProcessor(client: AuthClient) {
  let previous: { key: string; task: ReturnType<typeof completeAuthCallback> } | undefined;
  return async (url: string) => {
    const key = JSON.stringify(parseAuthCallback(url));
    if (previous?.key === key) {
      const result = await previous.task;
      const current = await getValidatedSession(client).catch(error => {
        throw providerError('validation', error);
      });
      if (!current || current.access_token !== result.session.access_token) {
        throw new AuthCallbackError('validation', 'already_processed', 'This link was already processed. Please request a new email instead of reopening it.');
      }
      return result;
    }
    const task = completeAuthCallback(client, url);
    previous = { key, task };
    return task;
  };
}

export async function getValidatedSession(client: AuthClient): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  const userResult = await client.auth.getUser(data.session.access_token);
  if (userResult.error) throw userResult.error;
  if (!userResult.data.user || userResult.data.user.id !== data.session.user.id ||
      !data.session.expires_at || data.session.expires_at <= Date.now() / 1000) return null;
  return data.session;
}
