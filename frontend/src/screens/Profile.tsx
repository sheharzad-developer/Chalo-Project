import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../stores/auth';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function Profile() {
  const nav = useNavigation<any>();
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const user = session?.user;
  const metadata = (user?.user_metadata ?? {}) as { full_name?: string; role?: string };
  const name = metadata.full_name || user?.email?.split('@')[0] || 'Guest';
  const email = user?.email ?? '-';
  const role = (metadata.role || 'rider').toLowerCase();
  const memberSince = user?.created_at ? formatMonth(user.created_at) : 'Today';
  const initials = getInitials(name);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0d9488', '#0f766e', '#134e4a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView>
          <View style={styles.heroInner}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark" size={12} color="#ffffff" />
              <Text style={styles.roleText}>{role.toUpperCase()}</Text>
            </View>
            <Text style={styles.email}>{email}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard icon="navigate-outline" label="Trips" value="12" />
          <StatCard icon="star" label="Rating" value="4.9" />
          <StatCard icon="calendar-outline" label="Since" value={memberSince} />
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.card}>
          <ActionRow icon="card-outline" label="Payment methods" subtitle="Manage cards via SafePay" />
          <Divider />
          <ActionRow icon="time-outline" label="Ride history" subtitle="Past trips & receipts" onPress={() => nav.navigate('Receipts')} />
          <Divider />
          <ActionRow icon="gift-outline" label="Promotions" subtitle="Invite & earn" />
          <Divider />
          <ActionRow icon="help-circle-outline" label="Help center" subtitle="FAQ & support" />
        </View>

        <Pressable onPress={signOut} style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color="#0f766e" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, subtitle, onPress }: { icon: IoniconName; label: string; subtitle?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color="#0f172a" />
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMonth(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
  } catch { return 'Today'; }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f4ef' },
  hero: { paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 6 },
  heroInner: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 24, gap: 6 },
  avatarRing: { width: 96, height: 96, borderRadius: 48, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 8 },
  avatar: { flex: 1, borderRadius: 48, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0f766e', fontSize: 32, fontWeight: '900' },
  name: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 2 },
  roleText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  body: { flex: 1, marginTop: -16 },
  bodyContent: { padding: 16, gap: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  statValue: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 2 },
  rowLabel: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  rowSubtitle: { color: '#64748b', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },
  pressed: { opacity: 0.55 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, backgroundColor: '#0f172a', borderRadius: 14, marginTop: 4 },
  signOutText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
