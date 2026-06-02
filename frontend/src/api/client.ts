import axios from 'axios';
import { supabase } from '../lib/supabase';

declare const process: { env?: Record<string, string | undefined> };

const API_ORIGIN = process.env?.EXPO_PUBLIC_API_URL ?? 'http://192.168.18.247:8000';
const BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api/v1`;

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  },
);
