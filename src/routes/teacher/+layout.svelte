<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/session';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  // Area /teacher hanya untuk Admin & Teacher. Siswa → dashboard siswa.
  $effect(() => {
    if ($user && $user.role === 'STUDENT') goto('/student/dashboard');
  });
</script>

{@render children()}
