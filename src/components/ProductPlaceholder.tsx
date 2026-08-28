import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

export default function ProductPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛍️</Text>
      <Text style={styles.text}>Image Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  icon: {
    fontSize: 45,
    marginBottom: 8,
  },

  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});