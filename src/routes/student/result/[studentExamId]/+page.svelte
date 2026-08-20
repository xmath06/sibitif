<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, CheckCircle2, XCircle, ArrowLeft, Trophy } from 'lucide-svelte';
  import Html from '$components/Html.svelte';

  let id = $derived($page.params.studentExamId ?? '');
  let loading = $state(true);
  let error = $state('');
  let data: any = $state(null);

  onMount(async () => {
    try {
      data = await api.get(`/exams/${id}/result`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal memuat hasil';
    } finally {
      loading = false;
    }
  });

  const se = $derived((data as any)?.data ?? data?.studentExam ?? data);
  function computePassed(): boolean | null {
    if (!se) return null;
    if (typeof se.passed === 'boolean') return se.passed;
    if (se.status === 'COMPLETED' && se.totalScore != null && se.passScore != null)
      return Number(se.totalScore) >= Number(se.passScore);
    return null;
  }
  const passed = $derived(computePassed());
</script>

{#if loading}
  <div class="grid h-[60vh] place-items-center text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /> Memuat hasil…</div>
{:else if error}
  <Card class="mx-auto mt-10 max-w-md p-6 text-center text-rose-600">{error}</Card>
{:else}
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="flex items-center gap-2 text-xl font-bold text-foreground"><Trophy class="h-5 w-5 text-primary" /> Hasil Ujian</h1>
      <p class="text-sm text-muted-foreground">{se?.schedule?.title ?? se?.examSchedule?.title ?? 'Ujian'}</p>
    </div>
    <Button variant="outline" onclick={() => (location.href = '/student/dashboard')}><ArrowLeft class="h-4 w-4" /> Kembali</Button>
  </div>

  <div class="grid gap-4 sm:grid-cols-3">
    <Card class="p-5 text-center">
      <p class="text-xs uppercase tracking-wide text-muted-foreground">Nilai</p>
      <p class="mt-1 text-3xl font-bold text-foreground">{se?.totalScore ?? '—'}</p>
      {#if se?.passScore != null}<p class="text-xs text-muted-foreground">Pass: {se.passScore}</p>{/if}
    </Card>
    <Card class="p-5 text-center">
      <p class="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
      <p class="mt-2"><Badge tone={se?.status === 'WAITING_GRADING' ? 'warning' : 'primary'}>{se?.status ?? '—'}</Badge></p>
    </Card>
    <Card class="p-5 text-center">
      <p class="text-xs uppercase tracking-wide text-muted-foreground">Keterangan</p>
      <p class="mt-2">
        {#if passed === true}<Badge tone="success">Lulus</Badge>
        {:else if passed === false}<Badge tone="danger">Tidak Lulus</Badge>
        {:else}<Badge tone="muted">—</Badge>{/if}
      </p>
    </Card>
  </div>

  {#if se?.answers?.length}
    <h2 class="mb-3 mt-8 text-lg font-semibold text-foreground">Rincian Jawaban</h2>
    <div class="space-y-3">
      {#each se.answers as ans, i (ans.id ?? i)}
        <Card class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Soal {i + 1}</p>
              {#if ans.essayAnswer}
                <div class="mt-1 text-sm text-muted-foreground line-clamp-3"><Html html={ans.essayAnswer} /></div>
              {/if}
              {#if ans.selectedOptionId || (ans.selectedOptionIds?.length)}
                <p class="mt-1 text-sm text-muted-foreground">Opsi: {ans.selectedOptionIds?.join(', ') ?? ans.selectedOptionId}</p>
              {/if}
            </div>
            <div class="shrink-0 text-right">
              {#if ans.score != null}
                <p class="font-semibold text-foreground">{ans.score}</p>
              {/if}
              {#if ans.correct !== undefined}
                {#if ans.correct}<CheckCircle2 class="ml-auto h-5 w-5 text-emerald-600" />{:else}<XCircle class="ml-auto h-5 w-5 text-rose-600" />{/if}
              {/if}
            </div>
          </div>
          {#if ans.teacherFeedback}<p class="mt-2 rounded bg-accent px-3 py-1.5 text-xs text-muted-foreground">Catatan guru: {ans.teacherFeedback}</p>{/if}
        </Card>
      {/each}
    </div>
  {/if}
{/if}
