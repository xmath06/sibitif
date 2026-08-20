<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Pause, Play, Plus, MessageSquare, Trash2, Users, Send, ArrowLeft } from 'lucide-svelte';
  import { formatDuration } from '$lib/utils';

  let scheduleId = $derived($page.params.scheduleId ?? '');
  let status = $state<any>(null);
  let loading = $state(true);
  let error = $state('');

  let minutes = $state(5);
  let motivation = $state('');
  let busy = $state(false);

  let now = $state(Date.now());
  let poll: ReturnType<typeof setInterval>;

  const remainingMs = $derived(
    status?.hasTimer && status?.deadlineAt ? Math.max(0, status.deadlineAt - now) : Infinity
  );
  const remainingSec = $derived(remainingMs === Infinity ? null : Math.floor(remainingMs / 1000));

  async function refresh() {
    try {
      const res = await api.get(`/monitor/${scheduleId}/status`);
      status = (res as any)?.data ?? res;
      error = '';
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat status'; }
    finally { loading = false; }
  }

  async function act(path: string, body?: unknown) {
    busy = true;
    try { await api.post(`/monitor/${scheduleId}${path}`, body); await refresh(); }
    catch (e) { error = e instanceof ApiError ? e.message : 'Gagal'; }
    finally { busy = false; }
  }

  onMount(async () => { await refresh(); poll = setInterval(async () => { now = Date.now(); await refresh(); }, 2000); });
  onDestroy(() => poll && clearInterval(poll));
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 class="text-xl font-bold text-foreground">Monitor Kelas</h1>
    <p class="text-sm text-muted-foreground">{status?.title ?? 'Jadwal'}</p>
  </div>
  <Button variant="outline" onclick={() => (location.href = '/teacher/schedules')}><ArrowLeft class="h-4 w-4" /> Jadwal</Button>
</div>
{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if status}
  <div class="grid gap-4 lg:grid-cols-3">
    <Card class="flex flex-col items-center justify-center p-8 lg:col-span-1">
      <p class="text-xs uppercase tracking-wide text-muted-foreground">Sisa Waktu</p>
      <p class="my-2 font-mono text-5xl font-bold tabular-nums text-foreground">
        {status.hasTimer ? formatDuration(remainingSec) : formatDuration(status.elapsedSeconds)}
      </p>
      <Badge tone={status.scheduleStatus === 'ON_GOING' ? 'success' : status.scheduleStatus === 'PAUSED' ? 'warning' : 'muted'}>{status.scheduleStatus}</Badge>
      {#if status.motivation}<p class="mt-4 rounded-lg bg-accent px-3 py-2 text-center text-sm text-foreground">“{status.motivation}”</p>{/if}
    </Card>

    <Card class="p-6 lg:col-span-2">
      <div class="grid grid-cols-3 gap-3 text-center">
        <div><p class="text-2xl font-bold text-foreground">{status.totalAllocated ?? 0}</p><p class="text-xs text-muted-foreground">Dialokasikan</p></div>
        <div><p class="text-2xl font-bold text-emerald-600">{status.inProgressCount ?? 0}</p><p class="text-xs text-muted-foreground">Sedang Ujian</p></div>
        <div><p class="text-2xl font-bold text-indigo-600">{status.submittedCount ?? 0}</p><p class="text-xs text-muted-foreground">Selesai</p></div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        {#if status.scheduleStatus === 'PAUSED'}
          <Button onclick={() => act('/resume')} disabled={busy}><Play class="h-4 w-4" /> Lanjutkan</Button>
        {:else}
          <Button variant="outline" onclick={() => act('/pause')} disabled={busy}><Pause class="h-4 w-4" /> Jeda</Button>
        {/if}
        <Button variant="outline" disabled={busy} onclick={() => act('/add-time', { minutes })}>
          <Plus class="h-4 w-4" /> +{minutes} mnt
        </Button>
        <input type="number" bind:value={minutes} min="1" class="h-9 w-20 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div class="mt-4 flex gap-2">
        <input bind:value={motivation} placeholder="Pesan motivasi…" class="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <Button variant="outline" disabled={busy} onclick={() => act('/motivation', { message: motivation })}><MessageSquare class="h-4 w-4" /> Set</Button>
        <Button variant="ghost" size="icon" disabled={busy} onclick={() => act('/motivation')} title="Hapus pesan"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
      </div>
    </Card>
  </div>

  <div class="mt-4 flex justify-end">
    <a href={`/schedules/${scheduleId}/projector`} class="text-sm font-medium text-primary hover:underline">Buka tampilan proyektor →</a>
  </div>
{/if}
