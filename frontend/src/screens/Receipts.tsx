import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

type Receipt = {
  id: string;
  ride_id: string;
  fare: number;
  payment_method: 'cash' | 'card';
  distance_km: number | null;
  duration_min: number | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  vehicle_type: string | null;
  created_at: string;
};

const VEHICLE_ICON: Record<string, string> = { bike: '🏍️', rickshaw: '🛺', car: '🚗', van: '🚐', bus: '🚌' };

export default function Receipts() {
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<Receipt[]>('/payments/receipts');
      setReceipts(data);
    } catch (e) {
      setError('Could not load your receipts. Pull to retry.');
      setReceipts((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (receipts === null && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={receipts ?? []}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
      ListHeaderComponent={error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={40} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No receipts yet</Text>
          <Text style={styles.emptyCopy}>Your paid rides will show up here.</Text>
        </View>
      }
      renderItem={({ item }) => <ReceiptCard receipt={item} />}
    />
  );
}

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const isCash = receipt.payment_method === 'cash';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.vehicle}>{VEHICLE_ICON[receipt.vehicle_type ?? 'car'] ?? '🚗'}</Text>
        <View style={styles.route}>
          <Text style={styles.addr} numberOfLines={1}>{receipt.pickup_address || 'Pickup'}</Text>
          <Text style={styles.addrTo} numberOfLines={1}>→ {receipt.dropoff_address || 'Destination'}</Text>
        </View>
        <Text style={styles.fare}>Rs {receipt.fare.toFixed(0)}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={[styles.methodPill, isCash ? styles.cashPill : styles.cardPill]}>
          <Ionicons name={isCash ? 'cash-outline' : 'card-outline'} size={12} color={isCash ? '#047857' : '#1d4ed8'} />
          <Text style={[styles.methodText, isCash ? styles.cashText : styles.cardText]}>{isCash ? 'Cash' : 'Card'}</Text>
        </View>
        <Text style={styles.meta}>
          {receipt.distance_km != null ? `${receipt.distance_km.toFixed(1)} km · ` : ''}{formatDate(receipt.created_at)}
        </Text>
      </View>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f4ef' },
  list: { flex: 1, backgroundColor: '#f7f4ef' },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
  errorBanner: { color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  emptyCopy: { color: '#64748b', fontSize: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicle: { fontSize: 24 },
  route: { flex: 1, gap: 2 },
  addr: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  addrTo: { color: '#64748b', fontSize: 13 },
  fare: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  methodPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cashPill: { backgroundColor: '#d1fae5' },
  cardPill: { backgroundColor: '#dbeafe' },
  methodText: { fontSize: 12, fontWeight: '800' },
  cashText: { color: '#047857' },
  cardText: { color: '#1d4ed8' },
  meta: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
});
