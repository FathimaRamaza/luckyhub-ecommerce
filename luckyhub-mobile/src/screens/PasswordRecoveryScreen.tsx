import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_REDIRECT_URL } from '../lib/authRedirect';
import { supabase } from '../lib/supabase';

export default function PasswordRecoveryScreen({ mode }: { mode: 'request' | 'reset' }) {
  const router = useRouter();
  const { session, recovering, refreshSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [updated, setUpdated] = useState(false);
  const reset = mode === 'reset';
  const canReset = Boolean(session) && recovering;

  const requestReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: AUTH_REDIRECT_URL,
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      Alert.alert('Unable to Send', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!canReset || busy) return;
    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Password Mismatch', 'Both passwords must match.');
      return;
    }
    setBusy(true);
    try {
      const current = await refreshSession();
      if (!current || current.user.id !== session?.user.id) {
        throw new Error('Your reset session has expired. Please request a new reset email.');
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmation('');
      setUpdated(true);
    } catch (error) {
      Alert.alert('Unable to Reset', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (recovering) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      router.replace('/login');
    } catch (error) {
      Alert.alert('Unable to Sign Out', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/logos/luckyhub-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>{reset ? 'Reset Password' : 'Forgot Password?'}</Text>
          <Text style={styles.subtitle}>
            {updated ? 'Your password has been updated. Return to login and use your new password.'
              : reset ? (canReset ? 'Choose a new password for your Lucky Hub account.' : 'Open the password reset link from your email to continue.')
                : sent ? 'If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.'
                  : 'Enter your email and we will send you a password reset link.'}
          </Text>
          <View style={styles.form}>
            {!reset && !sent && <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
                <TextInput style={styles.input} value={email} onChangeText={setEmail}
                  placeholder="Enter your email" placeholderTextColor={COLORS.textSecondary}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  autoComplete="email" editable={!busy} />
              </View>
              <Pressable style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={requestReset}>
                {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>SEND RESET LINK</Text>}
              </Pressable>
            </>}
            {reset && canReset && !updated && <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                <TextInput style={styles.input} value={password} onChangeText={setPassword}
                  placeholder="Enter new password" placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
                  autoComplete="new-password" editable={!busy} />
                <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} />
                <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation}
                  placeholder="Confirm new password" placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
                  autoComplete="new-password" editable={!busy} />
              </View>
              <Pressable style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={resetPassword}>
                {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>UPDATE PASSWORD</Text>}
              </Pressable>
            </>}
            {reset && !canReset && !updated && <Pressable style={styles.primaryButton} onPress={() => router.replace('/forgot-password')}>
              <Text style={styles.buttonText}>REQUEST NEW RESET LINK</Text>
            </Pressable>}
            <Pressable style={styles.secondaryButton} disabled={busy} onPress={backToLogin}>
              <Text style={styles.secondaryText}>{busy && updated ? 'Signing out...' : 'Back to Login'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 35, paddingBottom: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 25 },
  logo: { width: 150, height: 85 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', color: COLORS.textPrimary },
  subtitle: { marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: 'center', color: COLORS.textSecondary },
  form: { marginTop: 35 },
  label: { marginBottom: 8, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  inputContainer: { height: 55, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 18, backgroundColor: COLORS.white },
  input: { flex: 1, height: '100%', marginLeft: 10, fontSize: 14, color: COLORS.textPrimary },
  primaryButton: { height: 55, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.65 },
  buttonText: { fontSize: 15, fontWeight: '900', color: COLORS.white },
  secondaryButton: { marginTop: 25, alignItems: 'center', padding: 8 },
  secondaryText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
