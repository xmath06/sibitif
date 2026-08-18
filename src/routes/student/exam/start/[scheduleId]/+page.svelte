<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, KeyRound } from 'lucide-svelte';

  const scheduleId = $derived($page.params.scheduleId);
  let accessCode = $state('');
  let loading = $state(false);
  let error = $state('');
  // null = sedang mengecek; true = butuh token (tampilkan input); false = langsung mulai
  let needCode = $state<boolean | null>(null);

  async function start() {
    loading = true;
    error = '';
    try {
      const res = await api.post<{ success: boolean; data: { studentExamId: string } }>(
        `/exams/start/${scheduleId}`,
        accessCode ? { accessCode } : {}
      );
      goto(`/student/exam/${(res as any).data.studentExamId}`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal memulai ujian';
      loading = false;
      needCode = true; // gagal (mis. butuh token) -> tampilkan input
    }
  }

  onMount(async () => {
    try {
      const res: any = await api.get(`/student/schedules/${scheduleId}`);
      const sched = res?.data ?? res;
      // Jika guru tidak mengisi kode akses -> siswa langsung masuk ujian.
      if (!sched?.accessCode) {
        await start();
        return;
      }
      needCode = true;
    } catch {
      needCode = true; // fallback: tampilkan input token
    }
  });
</script>

<div class="grid min-h-[70vh] place-items-center px-4">
  {#if needCode === null}
    <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
  {:else if needCode}
    <Card class="w-full max-w-sm p-7">
      <div class="mb-5 flex flex-col items-center text-center">
        <div class="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound class="h-6 w-6" />
        </div>
        <h1 class="text-lg font-bold text-foreground">Mulai Ujian</h1>
        <p class="text-sm text-muted-foreground">Masukkan token untuk memulai ujian.</p>
      </div>
      {#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}
      <form onsubmit={(e) => (e.preventDefault(), start())} class="space-y-4">
        <input bind:value={accessCode} placeholder="Token ujian" class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <Button type="submit" class="w-full" disabled={loading}>
          {#if loading}<Loader2 class="h-4 w-4 animate-spin" />{/if} Mulai
        </Button>
      </form>
    </Card>
  {/if}
</div>
