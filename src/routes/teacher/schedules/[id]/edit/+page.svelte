<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import { page } from '$app/stores';
  import ScheduleForm from '$components/ScheduleForm.svelte';
  import { Loader2 } from 'lucide-svelte';

  let initial = $state<any>(null);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await api.get(`/schedules/${$page.params.id}`);
      initial = (res as any).data ?? res;
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal memuat jadwal';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Edit Jadwal — CBT LMS</title></svelte:head>

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if error}
  <p class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
{:else if initial}
  <ScheduleForm id={$page.params.id} initial={initial} />
{/if}
