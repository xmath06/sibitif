<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { API_URL } from '$api/client';
  import type { MonitorStatus } from '$api/types';
  import { formatDuration, cn } from '$lib/utils';
  import { Users, Send, PauseCircle, PlayCircle } from 'lucide-svelte';

  let { scheduleId }: { scheduleId: string } = $props();

  let status = $state<MonitorStatus | null>(null);
  let now = $state(Date.now());
  let err = $state('');

  const remainingSec = $derived(
    status?.deadlineAt ? Math.max(0, Math.floor((status.deadlineAt - now) / 1000)) : status?.remainingSeconds ?? null
  );
  const expired = $derived(remainingSec !== null && remainingSec <= 0);

  const tone = $derived(
    status?.scheduleStatus === 'PAUSED'
      ? 'warning'
      : remainingSec === null
        ? 'primary'
        : remainingSec > 900
          ? 'success'
          : remainingSec > 300
            ? 'warning'
            : 'danger'
  );

  const toneClass = $derived(
    cn(
      'font-mono font-extrabold tabular-nums leading-none transition-colors duration-700',
      tone === 'success' && 'text-emerald-500',
      tone === 'warning' && 'text-amber-500',
      tone === 'danger' && 'text-rose-600 animate-pulse-soft',
      tone === 'primary' && 'text-slate-800'
    )
  );

  let controller: AbortController | null = null;
  let tick: ReturnType<typeof setInterval>;

  async function connect() {
    controller?.abort();
    controller = new AbortController();
    err = '';
    try {
      const res = await fetch(`${API_URL}/monitor/${scheduleId}/stream`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal
      });
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const chunk of parts) {
          const line = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const payload = JSON.parse(json) as MonitorStatus | { data: MonitorStatus };
            status = (payload as { data?: MonitorStatus }).data ?? (payload as MonitorStatus);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') err = 'Koneksi terputus. Mencoba ulang…';
      // fallback polling
      setTimeout(() => connect(), 2000);
    }
  }

  onMount(() => {
    connect();
    tick = setInterval(() => (now = Date.now()), 1000);
  });
  onDestroy(() => {
    controller?.abort();
    if (tick) clearInterval(tick);
  });
</script>

<div class="flex h-screen flex-col bg-slate-900 text-white">
  <header class="flex items-center justify-between px-8 py-5">
    <div>
      <p class="text-sm uppercase tracking-widest text-slate-400">Ujian Berlangsung</p>
      <h1 class="text-3xl font-bold">{status?.title ?? 'Memuat…'}</h1>
      {#if status?.category}<span class="text-slate-400">· {status.category}</span>{/if}
    </div>
    <div class="flex items-center gap-6 text-center">
      <div>
        <div class="flex items-center gap-1 text-emerald-400"><Users class="h-5 w-5" /><span class="text-2xl font-bold tabular-nums">{status?.inProgressCount ?? 0}</span></div>
        <p class="text-xs uppercase tracking-wide text-slate-400">Mengerjakan</p>
      </div>
      <div>
        <div class="flex items-center gap-1 text-sky-400"><Send class="h-5 w-5" /><span class="text-2xl font-bold tabular-nums">{status?.submittedCount ?? 0}</span></div>
        <p class="text-xs uppercase tracking-wide text-slate-400">Submit</p>
      </div>
      <div>
        <div class="text-2xl font-bold tabular-nums text-slate-300">{status?.totalAllocated ?? 0}</div>
        <p class="text-xs uppercase tracking-wide text-slate-400">Total</p>
      </div>
    </div>
  </header>

  <main class="grid flex-1 place-items-center">
    {#if status?.scheduleStatus === 'PAUSED'}
      <div class="flex items-center gap-4 text-amber-400">
        <PauseCircle class="h-16 w-16" />
        <span class="text-6xl font-bold">DIJEDA</span>
      </div>
    {:else}
      <div class={cn('text-[12rem]', toneClass)}>{formatDuration(remainingSec)}</div>
    {/if}
  </main>

  <footer class="overflow-hidden border-t border-white/10 px-8 py-4">
    <div class="flex items-center gap-3">
      <PlayCircle class="h-6 w-6 shrink-0 text-indigo-400" />
      <div class="marquee whitespace-nowrap text-xl font-medium text-slate-200">
        {status?.motivation ?? 'Tetap fokus, kalian pasti bisa! 🚀'}
      </div>
    </div>
  </footer>

  {#if err}<div class="absolute right-4 top-4 rounded-lg bg-rose-600/90 px-3 py-1.5 text-sm">{err}</div>{/if}
</div>

<style>
  .marquee {
    animation: scroll-left 18s linear infinite;
  }
  @keyframes scroll-left {
    0% { transform: translateX(60vw); }
    100% { transform: translateX(-100%); }
  }
</style>
