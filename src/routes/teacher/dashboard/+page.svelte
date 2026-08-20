<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Button from '$components/ui/Button.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import { Loader2, Plus, MonitorPlay, GraduationCap, FileCheck2 } from 'lucide-svelte';

  interface Sched {
    id: string;
    title: string;
    scheduleStatus: string;
    category?: string | null;
  }
  let schedules = $state<Sched[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Sched[] }>('/schedules', { limit: 10000 });
      schedules = (res as any).data ?? [];
    } finally {
      loading = false;
    }
  });
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl font-bold text-foreground">Dashboard Guru</h1>
  <Button onclick={() => (location.href = '/teacher/schedules/new')}><Plus class="h-4 w-4" /> Buat Jadwal</Button>
</div>

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if schedules.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada jadwal ujian.</Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each schedules as s (s.id)}
      <Card class="flex flex-col p-5">
        <div class="mb-2 flex items-start justify-between gap-2">
          <h3 class="font-semibold text-foreground">{s.title}</h3>
          <Badge tone={s.scheduleStatus === 'ON_GOING' ? 'success' : 'muted'}>{s.scheduleStatus}</Badge>
        </div>
        {#if s.category}<p class="text-sm text-muted-foreground">{s.category}</p>{/if}
        <div class="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onclick={() => (location.href = `/schedules/${s.id}/projector`)}><MonitorPlay class="h-4 w-4" /> Proyektor</Button>
          <Button variant="outline" size="sm" onclick={() => (location.href = `/teacher/monitor/${s.id}`)}><GraduationCap class="h-4 w-4" /> Monitor</Button>
          <Button variant="outline" size="sm" onclick={() => (location.href = `/teacher/grading/${s.id}`)}><FileCheck2 class="h-4 w-4" /> Koreksi</Button>
        </div>
      </Card>
    {/each}
  </div>
{/if}
