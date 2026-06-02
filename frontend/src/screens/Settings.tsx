import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../stores/auth';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function Settings() {
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const user = session?.user;
  const metadata = (user?.user_metadata ?? {}) as { full_name?: string; role?: string };

  const [pushEnabled, setPushEnabled] = useState(true);
  const [locationAlways, setLocationAlways] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [emailReceipts, setEmailReceipts] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your Chalo account</Text>
        </View>

        <SectionHeader>Account</SectionHeader>
        <View style={styles.card}>
          <Row icon="person-outline" label="Name" value={metadata.full_name || '—'} />
          <Divider />
          <Row icon="mail-outline" label="Email" value={user?.email || '—'} />
          <Divider />
          <Row icon="shield-checkmark-outline" label="Role" value={(metadata.role || 'rider').toLowerCase()} />
        </View>

        <SectionHeader>Preferences</SectionHeader>
        <View style={styles.card}>
          <ToggleRow icon="notifications-outline" label="Push notifications" value={pushEnabled} onValueChange={setPushEnabled} />
          <Divider />
          <ToggleRow icon="location-outline" label="Always-on location" description="Improves driver matching" value={locationAlways} onValueChange={setLocationAlways} />
          <Divider />
          <ToggleRow icon="moon-outline" label="Dark mode" value={darkMode} onValueChange={setDarkMode} />
          <Divider />
          <ToggleRow icon="receipt-outline" label="Email ride receipts" value={emailReceipts} onValueChange={setEmailReceipts} />
        </View>

        <SectionHeader>Support</SectionHeader>
        <View style={styles.card}>
          <Row icon="help-circle-outline" label="Help center" chevron />
          <Divider />
          <Row icon="document-text-outline" label="Terms of service" chevron />
          <Divider />
          <Row icon="lock-closed-outline" label="Privacy policy" chevron />
          <Divider />
          <Row icon="information-circle-outline" label="App version" value="1.0.0" />
        </View>

        <SectionHeader danger>Danger zone</SectionHeader>
        <View style={styles.card}>
          <Pressable onPress={signOut} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.iconBoxDanger}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            </View>
            <Text style={styles.rowLabelDanger}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ children, danger }: { children: string; danger?: boolean }) {
  return <Text style={[styles.sectionTitle, danger && styles.sectionTitleDanger]}>{children}</Text>;
}

function Row({ icon, label, value, chevron, onPress }: { icon: IoniconName; label: string; value?: string; chevron?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress && !chevron} style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color="#0f172a" /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {chevron ? <Ionicons name="chevron-forward" size={16} color="#94a3b8" /> : null}
      </View>
    </Pressable>
  );
}

function ToggleRow({ icon, label, description, value, onValueChange }: { icon: IoniconName; label: string; description?: string; value: boolean; onValueChange: (next: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color="#0f172a" /></View>
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#cbd5e1', true: '#0f766e' }} thumbColor="#ffffff" ios_backgroundColor="#cbd5e1" />
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f4ef' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { marginTop: 8, marginBottom: 4, gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 14 },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginLeft: 4 },
  sectionTitleDanger: { color: '#dc2626' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconBoxDanger: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 2 },
  rowLabel: { flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' },
  rowLabelDanger: { flex: 1, color: '#dc2626', fontSize: 15, fontWeight: '700' },
  rowDescription: { color: '#64748b', fontSize: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },
  pressed: { opacity: 0.55 },
});
