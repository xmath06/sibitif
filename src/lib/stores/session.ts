import { writable, get } from 'svelte/store';
import { api } from '$api/client';
import type { SafeUser } from '$api/types';

export const user = writable<SafeUser | null>(null);
export const sessionLoading = writable(true);

export async function initSession() {
  // Jangan jalankan ulang bila sesi sudah aktif (mis. baru saja login).
  if (get(user)) {
    sessionLoading.set(false);
    return;
  }
  sessionLoading.set(true);
  try {
    const res = await api.get<{ success: boolean; data: { user: SafeUser } }>('/auth/me');
    const u = (res as any)?.data?.user;
    // JANGAN timpa user yang sudah di-set (login lebih baru). Menghindari
    // race: initSession pakai cookie lama (siswa) lalu menimpa sesi admin.
    if (u && get(user) === null) user.set(u);
  } catch {
    if (get(user) === null) user.set(null);
  } finally {
    sessionLoading.set(false);
  }
}

export async function login(username: string, password: string) {
  const res = await api.post<{ success: boolean; data: { user: SafeUser } }>('/auth/login', {
    username,
    password
  });
  user.set((res as any).data.user);
  return (res as any).data.user as SafeUser;
}

export async function logout() {
  await api.post('/auth/logout');
  user.set(null);
}
