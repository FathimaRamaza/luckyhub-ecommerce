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

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleSignup = async () => {
    const cleanName =
      fullName.trim();

    const cleanPhone =
      phone.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanName) {
      Alert.alert(
        'Name Required',
        'Please enter your full name.'
      );
      return;
    }

    if (!cleanPhone) {
      Alert.alert(
        'Phone Required',
        'Please enter your mobile number.'
      );
      return;
    }

    if (!cleanEmail) {
      Alert.alert(
        'Email Required',
        'Please enter your email address.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password Too Short',
        'Password must contain at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'Both passwords must match.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
            },
          },
        });

      if (error) {
        Alert.alert(
          'Signup Failed',
          error.message
        );
        return;
      }

      if (data.session) {
        Alert.alert(
          'Account Created',
          'Your Lucky Hub account has been created successfully.',
          [
            {
              text: 'Continue',
              onPress: () =>
                router.replace(
                  '/(tabs)/home'
                ),
            },
          ]
        );

        return;
      }

      Alert.alert(
        'Check Your Email',
        'Your account was created. Please check your email and confirm your account before logging in.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.replace('/login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Signup Failed',
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </Pressable>

          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logos/luckyhub-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Create your Lucky Hub customer
            account
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Full Name
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={
                  COLORS.textSecondary
                }
              />
            </View>

            <Text style={styles.label}>
              Mobile Number
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="call-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter mobile number"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                keyboardType="phone-pad"
              />
            </View>

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
                placeholder="Enter email address"
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
                placeholder="Create password"
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

            <Text style={styles.label}>
              Confirm Password
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={
                  setConfirmPassword
                }
                placeholder="Confirm password"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={[
                styles.signupButton,
                loading &&
                  styles.buttonDisabled,
              ]}
              disabled={loading}
              onPress={handleSignup}
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={
                    styles.signupButtonText
                  }
                >
                  CREATE ACCOUNT
                </Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text
                style={styles.loginQuestion}
              >
                Already have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.replace('/login')
                }
              >
                <Text
                  style={styles.loginText}
                >
                  Login
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
    paddingTop: 10,
    paddingBottom: 35,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
  },

  logoContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
  },

  logo: {
    width: 135,
    height: 70,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
    color: COLORS.textPrimary,
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },

  form: {
    marginTop: 28,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  inputContainer: {
    height: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  signupButton: {
    height: 55,
    marginTop: 7,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  signupButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.white,
  },

  loginRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginQuestion: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  loginText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
  },
});