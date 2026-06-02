import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../stores/auth';

type Role = 'rider' | 'driver';

export default function Signup() {
  const nav = useNavigation<any>();
  const signUp = useAuth((s) => s.signUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('rider');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim()) { Alert.alert('Name required', 'Enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Email required', 'Enter your email address.'); return; }
    if (password.length < 6) { Alert.alert('Password too short', 'Use at least 6 characters.'); return; }

    try {
      setSubmitting(true);
      const { error } = await signUp(email.trim(), password, fullName.trim(), role);
      if (error) { Alert.alert('Sign up failed', error); return; }
      Alert.alert('Account created', 'Check your email for a confirmation link if required.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>چلو</Text>
          <Text style={styles.logoSub}>Chalo — Car Service</Text>
        </View>

        <Text style={styles.heading}>Create account</Text>

        <TextInput placeholder="Full name" value={fullName} onChangeText={setFullName} style={styles.input} placeholderTextColor="#94a3b8" />
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#94a3b8" />
        <TextInput placeholder="Password (min 6 chars)" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#94a3b8" />

        <View style={styles.roleRow}>
          {(['rider', 'driver'] as const).map((r) => (
            <Pressable key={r} onPress={() => setRole(r)} style={[styles.roleBtn, role === r && styles.roleBtnActive]}>
              <Text style={role === r ? styles.roleTextActive : styles.roleText}>
                {r === 'rider' ? '🧑 Rider' : '🚗 Driver'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onSubmit} disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
        </Pressable>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.altLink}>Already have an account? <Text style={styles.altLinkBold}>Sign in</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f7f4ef' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center', gap: 14 },
  logoArea: { alignItems: 'center', marginBottom: 12, gap: 4 },
  logo: { fontSize: 48, color: '#0f766e' },
  logoSub: { color: '#0f766e', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  heading: { color: '#0f172a', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, borderRadius: 12, fontSize: 16, color: '#0f172a', backgroundColor: '#ffffff' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#ffffff' },
  roleBtnActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  roleText: { color: '#475569', fontWeight: '700' },
  roleTextActive: { color: '#fff', fontWeight: '700' },
  button: { backgroundColor: '#0f766e', padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pressed: { opacity: 0.8 },
  altLink: { textAlign: 'center', marginTop: 4, color: '#64748b', fontSize: 14 },
  altLinkBold: { color: '#0f766e', fontWeight: '800' },
});
