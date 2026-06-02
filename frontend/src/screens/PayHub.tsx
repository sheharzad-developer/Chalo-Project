import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PayHub() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>
          Payment is handled securely through SafePay when you complete a ride.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#0f766e" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Secure &amp; regulated</Text>
              <Text style={styles.infoDesc}>SafePay is regulated by the State Bank of Pakistan</Text>
            </View>
          </View>

          <Divider />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="card-outline" size={20} color="#0f766e" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Accepted methods</Text>
              <Text style={styles.infoDesc}>Visa, Mastercard (Debit &amp; Credit)</Text>
            </View>
          </View>

          <Divider />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="phone-portrait-outline" size={20} color="#0f766e" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoDesc}>All payments in PKR (Pakistani Rupee)</Text>
            </View>
          </View>

          <Divider />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#0f766e" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>3D Secure</Text>
              <Text style={styles.infoDesc}>Every payment verified with your bank OTP</Text>
            </View>
          </View>
        </View>

        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          <Step number="1" text="Book your ride and set your destination" />
          <Step number="2" text="After drop-off, tap Pay to complete" />
          <Step number="3" text="Enter your card details once and verify with OTP" />
          <Step number="4" text="You receive a confirmation — ride complete!" />
        </View>

        <Text style={styles.footer}>
          Your card details are never stored on Chalo servers. All payment data is handled directly by SafePay.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f4ef' },
  inner: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#475569', fontSize: 14, lineHeight: 20 },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  infoDesc: { color: '#64748b', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 70 },

  howCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  howTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  stepText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },

  footer: { color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
