import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/colors';
import { CustomerNotification, getCustomerNotifications, markCustomerNotificationRead } from '../src/services/customerNotificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError('');
    try {
      const rows = await getCustomerNotifications();
      if (request === version.current) setItems(rows);
    } catch {
      if (request === version.current) setError('Unable to load notifications. Pull down to retry.');
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void load();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void load();
    });
    return () => { listener.remove(); version.current++; };
  }, [load]));
  const markRead = async (item: CustomerNotification) => {
    try {
      await markCustomerNotificationRead(item.id);
      await load();
    } catch { setError('Unable to mark this notification as read. Please retry.'); }
  };
  return <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></Pressable>
      <Text style={styles.title}>Notifications</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={COLORS.primary} />}>
      {loading && items.length === 0 ? <ActivityIndicator color={COLORS.primary} /> : null}
      {error ? <Text accessibilityRole="alert" style={styles.message}>{error}</Text> : null}
      {!loading && !error && items.length === 0 ? <Text style={styles.message}>No notifications yet.</Text> : null}
      {items.map(item => <Pressable key={item.id} onPress={() => void markRead(item)} style={styles.card} accessibilityLabel={`${item.read_at ? 'Read' : 'Unread'}: ${item.title}`}>
        <Text style={[styles.title, item.read_at ? styles.read : undefined]}>{item.title}</Text>
        <Text style={styles.message}>{item.body}</Text>
        <Text style={styles.message}>{new Date(item.created_at).toLocaleString()}</Text>
      </Pressable>)}
      {items.length === 100 ? <Text style={styles.message}>Showing your latest 100 notifications.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  content: { padding: 20, flexGrow: 1 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  message: { color: COLORS.textSecondary, marginTop: 8, lineHeight: 22 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  read: { fontWeight: '400' },
});
