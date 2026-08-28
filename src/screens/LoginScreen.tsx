import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async () => {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Email Required',
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      Alert.alert(
        'Password Required',
        'Please enter your password.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        Alert.alert(
          'Login Failed',
          error.message
        );
        return;
      }

      if (!data.session) {
        Alert.alert(
          'Login Failed',
          'Unable to create a login session.'
        );
        return;
      }

      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert(
        'Login Failed',
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Password reset will be connected later.'
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.content
          }
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logos/luckyhub-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>
            Welcome Back
          </Text>

          <Text style={styles.subtitle}>
            Login to continue shopping with
            Lucky Hub
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Email Address
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>
              Password
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />

              <Pressable
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={21}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.forgotButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotText}>
                Forgot Password?
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.loginButton,
                loading &&
                  styles.buttonDisabled,
              ]}
              disabled={loading}
              onPress={handleLogin}
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  LOGIN
                </Text>
              )}
            </Pressable>

            <View style={styles.signupRow}>
              <Text
                style={styles.signupQuestion}
              >
                Don't have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.push('/signup')
                }
              >
                <Text
                  style={styles.signupText}
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 30,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },

  logo: {
    width: 150,
    height: 85,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    color: COLORS.textPrimary,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },

  form: {
    marginTop: 35,
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  inputContainer: {
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: COLORS.white,
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -5,
    marginBottom: 22,
  },

  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  loginButton: {
    height: 55,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
  },

  signupRow: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  signupQuestion: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  signupText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
  },
});