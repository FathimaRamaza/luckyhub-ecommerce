import { Stack } from 'expo-router';

import NotificationBootstrap from '../src/components/NotificationBootstrap';


export default function RootLayout() {
  return (
    <>
      {/* ==================================================
          NOTIFICATION SYSTEM
      ================================================== */}

      <NotificationBootstrap />


      {/* ==================================================
          APP ROUTES
      ================================================== */}

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="index"
        />

        <Stack.Screen
          name="login"
        />

        <Stack.Screen
          name="signup"
        />

        <Stack.Screen
          name="search"
        />

        <Stack.Screen
          name="product-details"
        />

        <Stack.Screen
          name="checkout-address"
        />

        <Stack.Screen
          name="order-success"
        />

        <Stack.Screen
          name="order/[orderNumber]"
        />

        <Stack.Screen
          name="(tabs)"
        />
      </Stack>
    </>
  );
}