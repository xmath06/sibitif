<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Clock, PlayCircle, RotateCcw, CheckCircle2, Lock } from 'lucide-svelte';
  import { formatClock } from '$lib/utils';

  interface ActiveSchedule {
    id: string;
    title: string;
    category?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    scheduleStatus: string;
    isActive: boolean;
    package?: { title?: string };
    studentExams?: { id: string; status: string }[];
  }

  interface HistoryItem {
    id: string;
    status: string;
    totalScore?: string | null;
    startedAt?: string | null;
    submittedAt?: string | null;
    schedule?: {
      title?: string;
      category?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      scheduleStatus?: string;
      package?: { title?: string; subject?: { name?: string } };
    };
  }

  let schedules = $state<ActiveSchedule[]>([]);
  let history = $state<HistoryItem[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await api.get('/student/schedules/active');
      schedules = ((res as any).data ?? res) as ActiveSchedule[];
      const h = await api.get('/student/schedules/history');
      history = ((h as any).data ?? h) as HistoryItem[];
    } finally {
      loading = false;
    }
  });

  function myExam(s: ActiveSchedule) {
    return s.studentExams?.[0];
  }
  function statusOf(s: ActiveSchedule): 'locked' | 'ready' | 'progress' | 'done' {
    const se = myExam(s);
    if (se?.status === 'COMPLETED' || se?.status === 'WAITING_GRADING') return 'done';
    if (se?.status === 'IN_PROGRESS') return 'progress';
    if (!s.isActive || s.scheduleStatus !== 'ON_GOING') return 'locked';
    return 'ready';
  }
</script>

<h1 class="mb-5 text-xl font-bold text-foreground">Daftar Ujian Saya</h1>

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if schedules.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Tidak ada ujian yang tersedia saat ini.</Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each schedules as s (s.id)}
      {@const st = statusOf(s)}
      <Card class="flex flex-col p-5">
        <div class="mb-2 flex items-start justify-between gap-2">
          <h3 class="font-semibold text-foreground">{s.title}</h3>
          {#if st === 'done'}<Badge tone="success">Selesai</Badge>
          {:else if st === 'progress'}<Badge tone="primary">Dikerjakan</Badge>
          {:else if st === 'ready'}<Badge tone="warning">Siap</Badge>
          {:else}<Badge tone="muted">Belum Buka</Badge>{/if}
        </div>
        {#if s.package?.title}<p class="text-sm text-muted-foreground">{s.package.title}</p>{/if}
        <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock class="h-3.5 w-3.5" /> Buka: {formatClock(s.startTime)}</p>

        <div class="mt-4 flex-1"></div>
        {#if st === 'locked'}
          <Button variant="outline" disabled class="w-full"><Lock class="h-4 w-4" /> Belum Dibuka</Button>
        {:else if st === 'ready'}
          <Button class="w-full" onclick={() => (location.href = `/student/exam/start/${s.id}`)}><PlayCircle class="h-4 w-4" /> Input Token &amp; Mulai</Button>
        {:else if st === 'progress'}
          <Button class="w-full" onclick={() => (location.href = `/student/exam/${myExam(s)!.id}`)}><RotateCcw class="h-4 w-4" /> Lanjutkan Ujian</Button>
         {:else}
           <Button variant="outline" class="w-full" onclick={() => (location.href = `/student/result/${myExam(s)!.id}`)}><CheckCircle2 class="h-4 w-4" /> Lihat Hasil</Button>
         {/if}
       </Card>
     {/each}
   </div>
{/if}

{#if history.length}
  <h2 class="mb-3 mt-10 text-lg font-semibold text-foreground">Riwayat Ujian &amp; Tugas</h2>
  <div class="space-y-2">
    {#each history as h (h.id)}
      <Card class="flex items-center justify-between gap-3 p-4">
        <div class="min-w-0">
          <p class="font-medium text-foreground">{h.schedule?.title ?? 'Ujian'}</p>
          <p class="text-xs text-muted-foreground">{h.schedule?.package?.subject?.name ?? ''}{h.schedule?.category ? ` · ${h.schedule.category}` : ''}</p>
          <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>Penugasan: {formatClock(h.schedule?.startTime)}</span>
            <span>Selesai: {formatClock(h.submittedAt)}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <Badge tone={h.status === 'COMPLETED' ? 'success' : h.status === 'WAITING_GRADING' ? 'warning' : h.status === 'IN_PROGRESS' ? 'primary' : 'muted'}>{h.status}</Badge>
          {#if h.totalScore != null}<span class="text-sm font-semibold text-foreground">{h.totalScore}</span>{/if}
          {#if h.status === 'COMPLETED' || h.status === 'WAITING_GRADING'}
            <Button variant="outline" size="sm" onclick={() => (location.href = `/student/result/${h.id}`)}>Hasil</Button>
          {:else if h.status === 'IN_PROGRESS'}
            <Button variant="outline" size="sm" onclick={() => (location.href = `/student/exam/${h.id}`)}>Lanjut</Button>
          {/if}
        </div>
      </Card>
    {/each}
  </div>
{/if}
