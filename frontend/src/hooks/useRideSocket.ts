import { useEffect, useRef } from 'react';

declare const process: { env?: Record<string, string | undefined> };

const API_ORIGIN = process.env?.EXPO_PUBLIC_API_URL ?? 'http://192.168.18.247:8000';
const WS_HOST = API_ORIGIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
const WS_PROTOCOL = API_ORIGIN.startsWith('https') ? 'wss' : 'ws';

export function useRideSocket(userId: string, token: string, onMessage: (m: any) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId || !token) return;
    const socket = new WebSocket(`${WS_PROTOCOL}://${WS_HOST}/ws/${userId}?token=${token}`);
    ws.current = socket;
    socket.onmessage = (e) => onMessage(JSON.parse(e.data));
    return () => socket.close();
  }, [userId, token]);

  return ws;
}
