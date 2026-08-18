<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/session';
  import { homeForRole } from '$lib/routing';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  // Hanya siswa yang boleh di area /student. Selain itu → beranda per role.
  $effect(() => {
    if ($user && $user.role !== 'STUDENT') goto(homeForRole($user.role));
  });
</script>

{@render children()}
