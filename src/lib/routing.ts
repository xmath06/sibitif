import type { Role } from '$api/types';

/** Rute beranda per role. Admin & Teacher berbagi konsol manajemen. */
export function homeForRole(role: Role): string {
  return role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard';
}

/** Rute tujuan setelah login. */
export function afterLogin(role: Role): string {
  return homeForRole(role);
}
