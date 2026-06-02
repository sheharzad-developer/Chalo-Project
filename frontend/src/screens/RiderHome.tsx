import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuth } from '../stores/auth';
import { api } from '../api/client';

declare const process: { env?: Record<string, string | undefined> };

const SAFEPAY_ENV = process.env?.EXPO_PUBLIC_SAFEPAY_ENV ?? 'sandbox';
const SAFEPAY_BASE =
  SAFEPAY_ENV === 'production'
    ? 'https://getsafepay.pk'
    : 'https://sandbox.getsafepay.pk';

type Coordinates = { lat: number; lng: number };

type Estimate = {
  distance_km: number;
  duration_min: number;
  fare: number;
};

type DriverTrip = {
  start: Coordinates;
  current: Coordinates;
  progress: number;
  etaMin: number;
};

type VehicleType = 'bike' | 'rickshaw' | 'car' | 'van' | 'bus';

const VEHICLES: { type: VehicleType; label: string; icon: string; multiplier: number; etaOffset: number }[] = [
  { type: 'bike', label: 'Bike', icon: '🏍️', multiplier: 0.45, etaOffset: -3 },
  { type: 'rickshaw', label: 'Rickshaw', icon: '🛺', multiplier: 0.65, etaOffset: -1 },
  { type: 'car', label: 'Car', icon: '🚗', multiplier: 1.0, etaOffset: 0 },
  { type: 'van', label: 'Van', icon: '🚐', multiplier: 1.5, etaOffset: 2 },
];

const BASE_FARE = 50;
const PER_KM = 25;
const PER_MIN = 5;
const MIN_FARE_PKR = 200;

const DESTINATION_PRESETS: { name: string; coords: Coordinates }[] = [
  { name: 'Euro Store', coords: { lat: 31.4960091, lng: 74.4187847 } },
  { name: 'Packages Mall', coords: { lat: 31.4715625, lng: 74.3529876 } },
];

async function getFareEstimate(pickup: Coordinates, dropoff: Coordinates): Promise<Estimate> {
  const { data } = await api.post<Estimate>('/rides/estimate', {
    pickup,
    dropoff,
    vehicle_type: 'car',
  });
  return data;
}

async function fetchDrivingRoute(start: Coordinates, end: Coordinates): Promise<Coordinates[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const json = await response.json();
    const coords = json.routes?.[0]?.geometry?.coordinates ?? [];
    return coords.map(([lng, lat]: number[]) => ({ lat, lng }));
  } catch {
    return [start, end];
  }
}

async function resolveDestination(input: string): Promise<Coordinates | null> {
  const coordMatch = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1&countrycodes=pk`;
    const response = await fetch(url, { headers: { 'User-Agent': 'ChaloApp/1.0' } });
    const results = await response.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch {}
  return null;
}

function fareFor(distance_km: number, duration_min: number, multiplier: number): number {
  const base = (BASE_FARE + distance_km * PER_KM + duration_min * PER_MIN) * multiplier;
  return Math.round(Math.max(MIN_FARE_PKR, base) * 100) / 100;
}

export default function RiderHome() {
  const signOut = useAuth((s) => s.signOut);
  const tabBarHeight = useBottomTabBarHeight();
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [settingDestination, setSettingDestination] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rideRequested, setRideRequested] = useState(false);
  const [driverTrip, setDriverTrip] = useState<DriverTrip | null>(null);
  const [routePath, setRoutePath] = useState<Coordinates[]>([]);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [tripPhase, setTripPhase] = useState<'pickup' | 'dropoff' | 'arrived' | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [trackerToken, setTrackerToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is needed to find nearby rides.');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        setLocationError('Unable to get your current location.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!rideRequested || !coords || !destinationCoords) return undefined;

    const driverStart = { lat: coords.lat + 0.006, lng: coords.lng - 0.004 };
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    function runLeg(legStart: Coordinates, legEnd: Coordinates) {
      return new Promise<void>(async (resolve) => {
        const path = await fetchDrivingRoute(legStart, legEnd);
        if (cancelled) return resolve();
        setRoutePath(path);
        let step = 0;
        setDriverTrip({ start: legStart, current: path[0], progress: 0, etaMin: Math.max(1, Math.ceil(path.length / 6)) });
        const totalTicks = path.length - 1;
        interval = setInterval(() => {
          step += 1;
          const reachedEnd = step >= totalTicks;
          const idx = reachedEnd ? totalTicks : step;
          const progress = totalTicks > 0 ? idx / totalTicks : 1;
          setDriverTrip({ start: legStart, current: path[idx], progress: Math.min(progress, 1), etaMin: reachedEnd ? 0 : Math.max(1, Math.ceil((totalTicks - step) / 6)) });
          if (reachedEnd && interval) { clearInterval(interval); interval = null; resolve(); }
        }, 250);
      });
    }

    (async () => {
      setTripPhase('pickup');
      await runLeg(driverStart, coords);
      if (cancelled) return;
      setTripPhase('dropoff');
      await runLeg(coords, destinationCoords);
      if (cancelled) return;
      setTripPhase('arrived');
    })();

    return () => { cancelled = true; if (interval) clearInterval(interval); setRoutePath([]); setTripPhase(null); };
  }, [coords, destinationCoords, rideRequested]);

  function etaPillText() {
    if (tripPhase === 'arrived') return 'Arrived';
    if (driverTrip && driverTrip.etaMin > 0) return `${driverTrip.etaMin} min`;
    if (tripPhase === 'pickup') return 'Picking up';
    return 'Almost there';
  }

  function driverCardCopy() {
    if (tripPhase === 'pickup') return 'White Corolla — ABC-247 — heading to your pickup';
    if (tripPhase === 'dropoff') return 'On your way to destination';
    if (tripPhase === 'arrived') return 'You have arrived at your destination!';
    return '';
  }

  function driverMarkerTitle() {
    if (tripPhase === 'pickup') return 'Driver coming to you';
    if (tripPhase === 'dropoff') return 'Taking you to destination';
    return 'Driver';
  }

  function driverMarkerDescription() {
    if (driverTrip && driverTrip.etaMin > 0) return `${driverTrip.etaMin} min away`;
    return '';
  }

  function primaryButtonLabel() {
    if (paid) return '✓ Paid — Ride Complete';
    if (tripPhase === 'arrived') {
      const amount = `Rs ${estimate?.fare.toFixed(0) ?? '—'}`;
      return paymentMethod === 'cash' ? `Confirm cash — ${amount}` : `Pay ${amount}`;
    }
    if (rideRequested) return 'Waiting for driver...';
    if (estimate && destinationCoords) return `Request ${VEHICLES.find(v => v.type === vehicleType)?.label ?? 'Ride'}`;
    if (settingDestination) return 'Get estimate';
    return 'Set destination';
  }

  function isPrimaryButtonDisabled() {
    return !coords || submitting || paid || (rideRequested && tripPhase !== 'arrived');
  }

  async function onPrimaryPress() {
    if (!coords) return;
    if (tripPhase === 'arrived' && !paid) {
      if (paymentMethod === 'cash') { await confirmCashPayment(); } else { await payRide(); }
      return;
    }
    if (!settingDestination) { setSettingDestination(true); return; }
    if (estimate && destinationCoords) { await requestRide(); return; }
    await estimateDestination();
  }

  async function pickPresetDestination(preset: { name: string; coords: Coordinates }) {
    if (!coords) return;
    setSettingDestination(true);
    setDestinationAddress(preset.name);
    setDestinationCoords(preset.coords);
    try {
      setSubmitting(true);
      setEstimate(await getFareEstimate(coords, preset.coords));
    } catch (error) {
      Alert.alert('Could not set destination', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function estimateDestination() {
    if (!coords) return;
    const trimmedAddress = destinationAddress.trim();
    if (!trimmedAddress) { Alert.alert('Destination required', 'Enter where you want to go.'); return; }
    try {
      setSubmitting(true);
      const dropoff = await resolveDestination(trimmedAddress);
      if (!dropoff) { Alert.alert('Destination not found', 'Try a full address with city, or paste coordinates.'); return; }
      setDestinationCoords(dropoff);
      setEstimate(await getFareEstimate(coords, dropoff));
    } catch (error) {
      Alert.alert('Could not set destination', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestRide() {
    if (!coords || !destinationCoords || !estimate) return;
    try {
      setSubmitting(true);
      const multiplier = VEHICLES.find((v) => v.type === vehicleType)?.multiplier ?? 1;
      const finalFare = fareFor(estimate.distance_km, estimate.duration_min, multiplier);
      const { data } = await api.post<{ id: string }>('/rides/request', {
        pickup: coords,
        dropoff: destinationCoords,
        pickup_address: 'Current location',
        dropoff_address: destinationAddress.trim(),
        fare: finalFare,
        distance_km: estimate.distance_km,
        duration_min: estimate.duration_min,
        vehicle_type: vehicleType,
        payment_method: paymentMethod,
      });
      setEstimate({ ...estimate, fare: finalFare });
      setCurrentRideId(data.id);
      setRideRequested(true);
    } catch (error) {
      Alert.alert('Ride request failed', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function payRide() {
    if (!currentRideId) return;
    try {
      setSubmitting(true);

      const { data } = await api.post<{
        tracker_token: string;
        amount_pkr: number;
        ride_id: string;
        safepay_env: string;
      }>('/payments/init-ride-payment', { ride_id: currentRideId });

      setTrackerToken(data.tracker_token);

      const checkoutUrl = `${SAFEPAY_BASE}/checkout?env=${data.safepay_env}&tracker=${data.tracker_token}`;
      const canOpen = await Linking.canOpenURL(checkoutUrl);
      if (canOpen) {
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Cannot open payment', 'Please try again or contact support.');
        return;
      }

      Alert.alert(
        'Complete your payment',
        `Your SafePay checkout has opened. Once you complete payment (Rs ${data.amount_pkr.toFixed(0)}), return here and tap Confirm Payment.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I paid — Confirm',
            onPress: () => confirmPayment(currentRideId, data.tracker_token),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Payment error', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPayment(rideId: string, token: string) {
    try {
      setSubmitting(true);
      await api.post('/payments/confirm-ride-payment', {
        ride_id: rideId,
        tracker_token: token,
      });
      setPaid(true);
      Alert.alert(
        'Payment Confirmed',
        estimate ? `Rs ${estimate.fare.toFixed(0)} paid via SafePay. Shukria for riding with Chalo! 🚗` : 'Payment received.',
      );
    } catch (error) {
      Alert.alert('Confirmation failed', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCashPayment() {
    if (!currentRideId) return;
    try {
      setSubmitting(true);
      await api.post('/payments/cash-ride-payment', { ride_id: currentRideId });
      setPaid(true);
      Alert.alert(
        'Ride complete',
        estimate ? `Please pay Rs ${estimate.fare.toFixed(0)} in cash to your driver. Shukria for riding with Chalo! 🚗` : 'Cash ride complete.',
      );
    } catch (error) {
      Alert.alert('Could not confirm payment', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function getErrorMessage(error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const detail = (error as any).response?.data?.detail;
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) return detail.map((i: any) => i?.msg).filter(Boolean).join('\n');
    }
    return error instanceof Error ? error.message : 'Please try again.';
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={tabBarHeight}
    >
      {coords ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          showsUserLocation
        >
          {destinationCoords && (
            <Marker coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }} title="Destination" description={destinationAddress} />
          )}
          {routePath.length > 1 && (
            <Polyline coordinates={routePath.map(p => ({ latitude: p.lat, longitude: p.lng }))} strokeColor="#0f766e" strokeWidth={4} />
          )}
          {driverTrip && (
            <Marker coordinate={{ latitude: driverTrip.current.lat, longitude: driverTrip.current.lng }} title={driverMarkerTitle()} description={driverMarkerDescription()}>
              <View style={styles.driverMarker}>
                <Text style={styles.driverMarkerText}>
                  {vehicleType === 'bike' ? '🏍️' : vehicleType === 'rickshaw' ? '🛺' : '🚗'}
                </Text>
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.emptyState}>
          {locationError ? (
            <><Text style={styles.emptyTitle}>Location unavailable</Text><Text style={styles.emptyCopy}>{locationError}</Text></>
          ) : (
            <><ActivityIndicator size="large" /><Text style={styles.emptyCopy}>Finding your location...</Text></>
          )}
        </View>
      )}

      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>چلو</Text>
          <Text style={styles.title}>Where to?</Text>
        </View>
        <Pressable onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.requestPanel}>
        <Text style={styles.panelLabel}>Pickup</Text>
        <Text style={styles.panelValue}>{coords ? 'Current location' : 'Waiting for location'}</Text>

        {rideRequested && driverTrip && (
          <View style={styles.driverCard}>
            <View style={styles.driverCardTop}>
              <View>
                <Text style={styles.panelLabel}>Driver assigned</Text>
                <Text style={styles.driverName}>Ali Khan</Text>
              </View>
              <View style={styles.etaPill}>
                <Text style={styles.etaText}>{etaPillText()}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(driverTrip.progress * 100, 8)}%` }]} />
            </View>
            <Text style={styles.helperText}>{driverCardCopy()}</Text>
          </View>
        )}

        {!rideRequested && (
          <View style={styles.presetRow}>
            {DESTINATION_PRESETS.map((preset) => {
              const active = destinationAddress === preset.name;
              return (
                <Pressable key={preset.name} disabled={!coords || submitting} onPress={() => pickPresetDestination(preset)} style={({ pressed }) => [styles.presetChip, active && styles.presetChipActive, pressed && styles.pressed]}>
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>{preset.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {settingDestination && !rideRequested && (
          <>
            <Text style={styles.panelLabel}>Destination</Text>
            <TextInput
              value={destinationAddress}
              onChangeText={(v) => { setDestinationAddress(v); setDestinationCoords(null); setEstimate(null); }}
              placeholder="Address, landmark, or lat,lng"
              autoCapitalize="words"
              returnKeyType="done"
              style={styles.destinationInput}
            />
            <Text style={styles.helperText}>Try a full address or paste coordinates like 24.8607, 67.0011.</Text>
          </>
        )}

        {estimate && !rideRequested && (
          <>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateText}>{estimate.distance_km.toFixed(1)} km</Text>
              <Text style={styles.estimateText}>{Math.round(estimate.duration_min)} min trip</Text>
            </View>
            <Text style={styles.panelLabel}>Choose a vehicle</Text>
            <View style={styles.vehicleRow}>
              {VEHICLES.map((v) => {
                const active = vehicleType === v.type;
                const fare = fareFor(estimate.distance_km, estimate.duration_min, v.multiplier);
                const eta = Math.max(1, Math.round(estimate.duration_min) + v.etaOffset);
                return (
                  <Pressable key={v.type} onPress={() => setVehicleType(v.type)} style={[styles.vehicleCard, active && styles.vehicleCardActive]}>
                    <Text style={styles.vehicleIcon}>{v.icon}</Text>
                    <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]}>{v.label}</Text>
                    <Text style={[styles.vehicleEta, active && styles.vehicleEtaActive]}>{eta} min</Text>
                    <Text style={[styles.vehicleFare, active && styles.vehicleFareActive]}>Rs {fare.toFixed(0)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.panelLabel}>Payment</Text>
            <View style={styles.payRow}>
              {([
                { key: 'cash', label: 'Cash', icon: '💵' },
                { key: 'card', label: 'Card', icon: '💳' },
              ] as const).map((m) => {
                const active = paymentMethod === m.key;
                return (
                  <Pressable key={m.key} onPress={() => setPaymentMethod(m.key)} style={[styles.payChip, active && styles.payChipActive]}>
                    <Text style={styles.payIcon}>{m.icon}</Text>
                    <Text style={[styles.payText, active && styles.payTextActive]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Pressable disabled={isPrimaryButtonDisabled()} onPress={onPrimaryPress} style={[styles.primaryButton, isPrimaryButtonDisabled() && styles.primaryButtonDisabled]}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{primaryButtonLabel()}</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  emptyCopy: { color: '#64748b', textAlign: 'center' },
  topBar: { position: 'absolute', top: 52, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#0f766e', fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  signOutButton: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  signOutText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  requestPanel: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  panelLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  panelValue: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  driverCard: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: '#d1fae5' },
  driverCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverName: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  etaPill: { backgroundColor: '#0f766e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  etaText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 5, backgroundColor: '#d1fae5', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: '#0f766e', borderRadius: 999 },
  helperText: { color: '#64748b', fontSize: 12 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  presetChipActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  presetText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  presetTextActive: { color: '#ffffff' },
  pressed: { opacity: 0.6 },
  destinationInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#0f172a' },
  estimateRow: { flexDirection: 'row', gap: 12 },
  estimateText: { flex: 1, textAlign: 'center', color: '#0f172a', fontWeight: '700', fontSize: 14, backgroundColor: '#f1f5f9', borderRadius: 8, paddingVertical: 8 },
  vehicleRow: { flexDirection: 'row', gap: 8 },
  vehicleCard: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, backgroundColor: '#fafafa' },
  vehicleCardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  vehicleIcon: { fontSize: 22 },
  vehicleLabel: { color: '#475569', fontSize: 12, fontWeight: '700' },
  vehicleLabelActive: { color: '#0f766e' },
  vehicleEta: { color: '#94a3b8', fontSize: 11 },
  vehicleEtaActive: { color: '#0f766e' },
  vehicleFare: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  vehicleFareActive: { color: '#0f766e' },
  payRow: { flexDirection: 'row', gap: 8 },
  payChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 11, backgroundColor: '#fafafa' },
  payChipActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  payIcon: { fontSize: 16 },
  payText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  payTextActive: { color: '#0f766e' },
  primaryButton: { backgroundColor: '#0f172a', minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonDisabled: { backgroundColor: '#94a3b8' },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  driverMarker: { backgroundColor: '#0f766e', borderRadius: 20, padding: 6 },
  driverMarkerText: { fontSize: 20 },
});
