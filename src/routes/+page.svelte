<script lang="ts">
  import { goto } from '$app/navigation';
  import { user, sessionLoading } from '$lib/stores/session';
  import { homeForRole } from '$lib/routing';

  // Redirect reaktif: tunggu sesi selesai dimuat, lalu arahkan berdasarkan role.
  // (onMount sekali jalan bisa kelewat karena initSession async → user tertahan di "Mengalihkan…")
  $effect(() => {
    if ($sessionLoading) return;
    if (!$user) {
      goto('/login');
      return;
    }
    goto(homeForRole($user.role));
  });
</script>

<div class="grid min-h-screen place-items-center text-muted-foreground">Mengalihkan…</div>
