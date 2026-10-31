import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { AuthCallbackError, createAuthCallbackProcessor, getAuthCallbackDiagnostics } from '../../src/lib/authCallback';
import { useAuth } from '../../src/contexts/AuthContext';

type CallbackStatus =
  | 'loading'
  | 'success'
  | 'error';

const processCallback = createAuthCallbackProcessor(supabase);

export default function AuthCallbackPage() {
  const router = useRouter();

  const incomingUrl =
    Linking.useLinkingURL();

  const { refreshSession, setRecovering } = useAuth();

  const [status, setStatus] =
    useState<CallbackStatus>(
      'loading'
    );

  const [message, setMessage] =
    useState(
      'Verifying your Lucky Hub account...'
    );

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleCallback = async () => {
      try {
        const url = incomingUrl ?? await Linking.getInitialURL();
        if (!active) return;
        if (__DEV__) console.info('Auth callback metadata:', getAuthCallbackDiagnostics(url ?? ''));
        if (!url) throw new Error('No email link was found. Please open the link from your email.');
        setStatus('loading');
        setMessage('Checking your Lucky Hub email link...');
        // Keep private screens unavailable until the link is verified by Supabase.
        setRecovering(true);
        const result = await processCallback(url);
        if (!active) return;
        const validated = await refreshSession();
        if (!active) return;
        if (!validated || validated.user.id !== result.session.user.id) {
          throw new Error('Unable to validate this session. Please request a new email link.');
        }
        setRecovering(result.recovery);
        if (result.recovery) {
          router.replace('/reset-password');
          return;
        }
        setStatus('success');
        setMessage('Your email has been verified successfully.');
        timer = setTimeout(() => router.replace('/(tabs)/home'), 1200);
      } catch (error) {
        if (!active) return;
        setRecovering(false);
        setStatus('error');
        setMessage(error instanceof AuthCallbackError ? error.message : 'Unable to validate this session. Check your connection and request a new email link.');
      }
    };
    void handleCallback();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [incomingUrl, refreshSession, router, setRecovering]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text
              style={styles.title}
            >
              Verifying Email
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View
              style={
                styles.successIcon
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={72}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={styles.title}
            >
              Email Verified
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View
              style={styles.errorIcon}
            >
              <Ionicons
                name="alert-circle-outline"
                size={72}
                color="#C62828"
              />
            </View>

            <Text
              style={styles.title}
            >
              Verification Failed
            </Text>
          </>
        )}

        <Text
          style={styles.message}
        >
          {message}
        </Text>

        {status === 'success' && (
          <Pressable
            style={
              styles.primaryButton
            }
            onPress={() =>
              router.replace(
                '/(tabs)/home'
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              CONTINUE
            </Text>
          </Pressable>
        )}

        {status === 'error' && (
          <Pressable
            style={
              styles.primaryButton
            }
            onPress={() =>
              router.replace(
                '/login'
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              BACK TO LOGIN
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIcon: {
    marginBottom: 14,
  },

  errorIcon: {
    marginBottom: 14,
  },

  title: {
    marginTop: 22,
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  message: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  primaryButton: {
    width: '100%',
    height: 55,
    marginTop: 30,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.white,
  },
});
