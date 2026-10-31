import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../src/constants/colors';
import { supabase } from '../src/lib/supabase';

import { AUTH_REDIRECT_URL } from '../src/lib/authRedirect';

export default function CheckEmailPage() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      email?: string;
    }>();

  const email =
    typeof params.email === 'string'
      ? params.email
      : '';

  const [resending, setResending] =
    useState(false);

  const handleResend = async () => {
    if (!email) {
      Alert.alert(
        'Email Missing',
        'Please return to signup and enter your email address again.'
      );

      return;
    }

    try {
      setResending(true);

      const { error } =
        await supabase.auth.resend({
          type: 'signup',
          email,

          options: {
            emailRedirectTo:
              AUTH_REDIRECT_URL,
          },
        });

      if (error) {
        Alert.alert(
          'Unable to Resend',
          error.message
        );

        return;
      }

      Alert.alert(
        'Email Sent',
        'A new Lucky Hub verification email has been sent. Please check your inbox and spam folder.'
      );
    } catch (error) {
      console.error(
        'Resend verification error:',
        error
      );

      Alert.alert(
        'Unable to Resend',
        'Something went wrong. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="mail-unread-outline"
            size={54}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.title}>
          Check Your Email
        </Text>

        <Text style={styles.description}>
          We sent a verification link to
        </Text>

        {email ? (
          <Text style={styles.email}>
            {email}
          </Text>
        ) : null}

        <Text style={styles.instructions}>
          Open the email and tap the
          verification button to activate
          your Lucky Hub account.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />

          <Text style={styles.infoText}>
            If you cannot find the email,
            please check your spam or junk
            folder.
          </Text>
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            resending &&
              styles.disabledButton,
          ]}
          disabled={resending}
          onPress={handleResend}
        >
          {resending ? (
            <ActivityIndicator
              color={COLORS.white}
            />
          ) : (
            <Text
              style={
                styles.primaryButtonText
              }
            >
              RESEND VERIFICATION EMAIL
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.replace('/login')
          }
        >
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={COLORS.primary}
          />

          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Back to Login
          </Text>
        </Pressable>
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

  iconCircle: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: '#E8F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  description: {
    marginTop: 14,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  email: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  instructions: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  infoBox: {
    width: '100%',
    marginTop: 26,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F3F8F7',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },

  primaryButton: {
    width: '100%',
    height: 55,
    marginTop: 28,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.65,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.white,
  },

  secondaryButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },

  secondaryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
