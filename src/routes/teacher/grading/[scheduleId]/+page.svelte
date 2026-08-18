<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, ArrowLeft, Pencil, X, FileCheck2 } from 'lucide-svelte';

  let scheduleId = $derived($page.params.scheduleId ?? '');
  let loading = $state(true);
  let error = $state('');
  let recap = $state<any[]>([]);
  let scheduleTitle = $state('');

  // modal penilaian esai
  let show = $state(false);
  let detail = $state<any>(null);
  let grades = $state<{ questionId: string; score: string; teacherFeedback: string }[]>([]);
  let saving = $state(false);
  let formErr = $state('');

  async function load() {
    loading = true; error = '';
    try {
      const res = await api.get(`/grading/recap/schedule/${scheduleId}`);
      const body = res as any;
      recap = Array.isArray(body) ? body : body.data ?? [];
      scheduleTitle = body?.schedule?.title ?? body?.title ?? '';
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }

  async function openGrade(studentExamId: string) {
    formErr = '';
    try {
      const d = await api.get(`/grading/${studentExamId}`);
      detail = d as any;
      const se = detail?.studentExam ?? detail;
      grades = (se?.answers ?? [])
        .filter((a: any) => a.question?.questionType === 'ESSAY' || a.questionType === 'ESSAY' || a.essayAnswer)
        .map((a: any) => ({ questionId: a.questionId, score: String(a.score ?? ''), teacherFeedback: a.teacherFeedback ?? '' }));
      show = true;
    } catch (e) { formErr = e instanceof ApiError ? e.message : 'Gagal memuat jawaban'; }
  }
  async function saveGrades() {
    if (!detail) return;
    saving = true; formErr = '';
    const studentExamId = (detail.studentExam ?? detail).id;
    try {
      await api.post(`/grading/${studentExamId}/essays`, {
        grades: grades.map((g) => ({ questionId: g.questionId, score: g.score === '' ? null : Number(g.score), teacherFeedback: g.teacherFeedback || null }))
      });
      show = false; await load();
    } catch (e) { formErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { saving = false; }
  }

  onMount(load);
</script>

<div class="mb-5 flex items-center justify-between">
  <div>
    <h1 class="flex items-center gap-2 text-xl font-bold text-foreground"><FileCheck2 class="h-5 w-5 text-primary" /> Koreksi Ujian</h1>
    <p class="text-sm text-muted-foreground">{scheduleTitle || 'Jadwal'}</p>
  </div>
  <Button variant="outline" onclick={() => (location.href = '/teacher/schedules')}><ArrowLeft class="h-4 w-4" /> Jadwal</Button>
</div>
{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if recap.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada hasil.</Card>
{:else}
  <Card class="overflow-hidden p-0">
    <table class="w-full text-sm">
      <thead class="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th class="px-4 py-3">Siswa</th>
          <th class="px-4 py-3">Nilai</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each recap as r, i (r.studentExamId ?? r.id ?? i)}
          {@const se = r.studentExam ?? r}
          <tr class="border-t border-border">
            <td class="px-4 py-3 font-medium text-foreground">{se?.user?.name ?? se?.student?.name ?? r.studentName ?? '—'}</td>
            <td class="px-4 py-3 text-foreground">{se?.totalScore ?? r.totalScore ?? '—'}</td>
            <td class="px-4 py-3"><Badge tone={se?.status === 'WAITING_GRADING' ? 'warning' : 'primary'}>{se?.status ?? r.status ?? '—'}</Badge></td>
            <td class="px-4 py-3 text-right">
              <Button variant="outline" size="sm" onclick={() => openGrade(se?.id ?? r.studentExamId)}><Pencil class="h-4 w-4" /> Nilai Esai</Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
{/if}

{#if show && detail}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (show = false)} onkeydown={(e) => e.key === 'Escape' && (show = false)}>
    <Card class="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">Penilaian Esai</h3>
        <button onclick={() => (show = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if formErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formErr}</p>{/if}
      {#if grades.length === 0}
        <p class="text-sm text-muted-foreground">Tidak ada soal esai pada ujian ini.</p>
      {:else}
        <div class="space-y-4">
          {#each grades as g, i (g.questionId)}
            <div class="rounded-lg border border-border p-3">
              <p class="text-xs font-medium text-muted-foreground">Soal Esai #{i + 1}</p>
              <label class="mt-1 block text-sm">Nilai
                <input bind:value={g.score} type="number" class="ml-2 h-9 w-24 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <textarea bind:value={g.teacherFeedback} rows="2" placeholder="Catatan (opsional)" class="mt-2 w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:ring-2 focus:ring-ring"></textarea>
            </div>
          {/each}
        </div>
      {/if}
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (show = false)}>Batal</Button>
        <Button onclick={saveGrades} disabled={saving || grades.length === 0}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan Nilai</Button>
      </div>
    </Card>
  </div>
{/if}
