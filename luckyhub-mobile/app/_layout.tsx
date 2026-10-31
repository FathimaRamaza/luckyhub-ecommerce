import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import NotificationBootstrap from '../src/components/NotificationBootstrap';
import { COLORS } from '../src/constants/colors';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

export const unstable_settings = { anchor: 'login' };

function AuthenticatedStack() {
  const { session, loading, recovering } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: COLORS.white, justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} />
    </View>;
  }
  return (
    <>
      <NotificationBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="check-email" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="auth/callback" />
        <Stack.Protected guard={Boolean(session) && !recovering}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" />
          <Stack.Screen name="product-details" />
          <Stack.Screen name="checkout-address" />
          <Stack.Screen name="order-success" />
          <Stack.Screen name="order/[orderNumber]" />
          <Stack.Screen name="wishlist" />
          <Stack.Screen name="printing-service" />
          <Stack.Screen name="printing-requests" />
          <Stack.Screen name="notifications" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <AuthProvider><AuthenticatedStack /></AuthProvider>;
}
