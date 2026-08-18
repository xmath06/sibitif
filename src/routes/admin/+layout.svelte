<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/session';
  import { homeForRole } from '$lib/routing';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  // Area /admin hanya untuk ADMIN.
  $effect(() => {
    if ($user && $user.role !== 'ADMIN') goto(homeForRole($user.role));
  });
</script>

{@render children()}
