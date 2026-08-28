import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
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

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      ...(Platform.OS !== 'web'
        ? {
            storage: AsyncStorage,
          }
        : {}),

      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
);

if (Platform.OS !== 'web') {
  AppState.addEventListener(
    'change',
    (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }
  );
}