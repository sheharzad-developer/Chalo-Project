import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

type Receipt = {
  id: string;
  fare: number;
  payment_method: 'cash' | 'card';
  dropoff_address: string | null;
  vehicle_type: string | null;
  created_at: string;
};

type Earnings = {
  ride_count: number;
  total_earned: number;
  cash_collected: number;
  card_earned: number;
  receipts: Receipt[];
};

export default function DriverEarnings() {
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<Earnings>('/payments/driver/earnings');
      setData(res.data);
    } catch {
      setError('Could not load earnings. Pull to retry.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (data === null && !error) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0f766e" /></View>;
  }

  const e = data ?? { ride_count: 0, total_earned: 0, cash_collected: 0, card_earned: 0, receipts: [] };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
    >
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total earned</Text>
        <Text style={styles.heroValue}>Rs {e.total_earned.toFixed(0)}</Text>
        <Text style={styles.heroSub}>{e.ride_count} {e.ride_count === 1 ? 'ride' : 'rides'}</Text>
      </View>

      <View style={styles.splitRow}>
        <View style={styles.splitCard}>
          <Ionicons name="cash-outline" size={18} color="#047857" />
          <Text style={styles.splitValue}>Rs {e.cash_collected.toFixed(0)}</Text>
          <Text style={styles.splitLabel}>Cash collected</Text>
          <Text style={styles.splitNote}>already in hand</Text>
        </View>
        <View style={styles.splitCard}>
          <Ionicons name="card-outline" size={18} color="#1d4ed8" />
          <Text style={styles.splitValue}>Rs {e.card_earned.toFixed(0)}</Text>
          <Text style={styles.splitLabel}>Card earned</Text>
          <Text style={styles.splitNote}>paid out weekly</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent rides</Text>
      {e.receipts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={36} color="#94a3b8" />
          <Text style={styles.emptyCopy}>No completed rides yet.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {e.receipts.map((r) => (
            <View key={r.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowAddr} numberOfLines={1}>{r.dropoff_address || 'Destination'}</Text>
                <Text style={styles.rowMeta}>{r.payment_method === 'cash' ? 'Cash' : 'Card'} · {formatDate(r.created_at)}</Text>
              </View>
              <Text style={styles.rowFare}>Rs {r.fare.toFixed(0)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f4ef' },
  screen: { flex: 1, backgroundColor: '#f7f4ef' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  errorBanner: { color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: 10, padding: 10, fontSize: 13 },
  heroCard: { backgroundColor: '#0f766e', borderRadius: 18, padding: 22, alignItems: 'center', gap: 4 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { color: '#ffffff', fontSize: 40, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  splitRow: { flexDirection: 'row', gap: 12 },
  splitCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 14, gap: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  splitValue: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 2 },
  splitLabel: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  splitNote: { color: '#94a3b8', fontSize: 11 },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4, marginTop: 4 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyCopy: { color: '#64748b', fontSize: 14 },
  list: { backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowMain: { flex: 1, gap: 2 },
  rowAddr: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  rowMeta: { color: '#94a3b8', fontSize: 12 },
  rowFare: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
});
