import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  useEffect,
  useRef,
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

type CallbackStatus =
  | 'loading'
  | 'success'
  | 'error';

function getUrlParams(url: string) {
  const queryPart =
    url.includes('?')
      ? url
          .split('?')[1]
          ?.split('#')[0] ?? ''
      : '';

  const hashPart =
    url.includes('#')
      ? url.split('#')[1] ?? ''
      : '';

  const combined =
    [queryPart, hashPart]
      .filter(Boolean)
      .join('&');

  const params =
    new URLSearchParams(combined);

  return {
    accessToken:
      params.get('access_token'),

    refreshToken:
      params.get('refresh_token'),

    code:
      params.get('code'),

    error:
      params.get('error'),

    errorCode:
      params.get('error_code'),

    errorDescription:
      params.get(
        'error_description'
      ),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();

  const incomingUrl =
    Linking.useLinkingURL();

  const processedUrlRef =
    useRef<string | null>(null);

  const [status, setStatus] =
    useState<CallbackStatus>(
      'loading'
    );

  const [message, setMessage] =
    useState(
      'Verifying your Lucky Hub account...'
    );

  useEffect(() => {
    const handleCallback = async () => {
      if (!incomingUrl) {
        return;
      }

      if (
        processedUrlRef.current ===
        incomingUrl
      ) {
        return;
      }

      processedUrlRef.current =
        incomingUrl;

      try {
        setStatus('loading');
        setMessage(
          'Verifying your Lucky Hub account...'
        );

        const {
          accessToken,
          refreshToken,
          code,
          error,
          errorCode,
          errorDescription,
        } = getUrlParams(
          incomingUrl
        );

        if (
          error ||
          errorCode ||
          errorDescription
        ) {
          throw new Error(
            errorDescription ||
              error ||
              errorCode ||
              'Email verification failed.'
          );
        }

        /*
         * Supabase implicit auth flow.
         * Confirmation link normally
         * redirects with access_token
         * and refresh_token.
         */
        if (
          accessToken &&
          refreshToken
        ) {
          const {
            error: sessionError,
          } =
            await supabase.auth.setSession(
              {
                access_token:
                  accessToken,

                refresh_token:
                  refreshToken,
              }
            );

          if (sessionError) {
            throw sessionError;
          }
        } else if (code) {
          /*
           * Also support PKCE/code flow
           * if the project uses it later.
           */
          const {
            error: exchangeError,
          } =
            await supabase.auth
              .exchangeCodeForSession(
                code
              );

          if (exchangeError) {
            throw exchangeError;
          }
        }

        const {
          data: {
            session,
          },
          error: sessionCheckError,
        } =
          await supabase.auth
            .getSession();

        if (sessionCheckError) {
          throw sessionCheckError;
        }

        if (!session) {
          setStatus('success');

          setMessage(
            'Your email has been verified successfully. Please login to continue.'
          );

          return;
        }

        setStatus('success');

        setMessage(
          'Your email has been verified successfully.'
        );

        setTimeout(() => {
          router.replace(
            '/(tabs)/home'
          );
        }, 1200);
      } catch (error) {
        console.error(
          'Auth callback error:',
          error
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'We could not verify your email. Please try again.';

        setStatus('error');
        setMessage(errorMessage);
      }
    };

    handleCallback();
  }, [incomingUrl, router]);

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