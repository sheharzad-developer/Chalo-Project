import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../stores/auth';

export default function Login() {
  const nav = useNavigation<any>();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) Alert.alert('Login failed', error);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>چلو</Text>
          <Text style={styles.logoSub}>Chalo — Car Service</Text>
        </View>

        <Text style={styles.heading}>Sign in</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
        <Pressable onPress={onSubmit} disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
        <Pressable onPress={() => nav.navigate('Signup')}>
          <Text style={styles.altLink}>No account? <Text style={styles.altLinkBold}>Sign up</Text></Text>
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
  button: { backgroundColor: '#0f766e', padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pressed: { opacity: 0.8 },
  altLink: { textAlign: 'center', marginTop: 4, color: '#64748b', fontSize: 14 },
  altLinkBold: { color: '#0f766e', fontWeight: '800' },
});
