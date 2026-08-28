import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL in .env'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env'
  );
}

export const publicSupabase =
  createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );