import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,

        tabBarStyle: {
          height: 65 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="home-outline"
              size={25}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="grid-outline"
              size={25}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="cart-outline"
              size={25}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="cube-outline"
              size={25}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="person-outline"
              size={25}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}