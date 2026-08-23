<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import DataTable from '$components/ui/DataTable.svelte';
  import { Loader2, ArrowLeft, Pencil, X, FileCheck2, Download } from 'lucide-svelte';
  import { resolveTypeWeights } from '$lib/scoring';
  import Html from '$components/Html.svelte';


  let scheduleId = $derived($page.params.scheduleId ?? '');
  let loading = $state(true);
  let error = $state('');
  let recap = $state<any[]>([]);
  let scheduleTitle = $state('');

  // modal penilaian esai
  let show = $state(false);
  let detail = $state<any>(null);
  let essays = $state<{ questionId: string; questionText: string; essayAnswer: string; wordCount?: number; answerKey?: string | null; score: string; teacherFeedback: string; questionType: string; maxScore: number }[]>([]);
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
      const typeWeights = resolveTypeWeights(se?.schedule?.package?.typeScoreWeight);
      essays = (se?.answers ?? [])
        .filter((a: any) => a.question?.questionType === 'ESSAY' || a.question?.questionType === 'URAIAN_PENDEK' || a.questionType === 'ESSAY' || a.questionType === 'URAIAN_PENDEK' || a.essayAnswer)
        .map((a: any) => {
          const qt = a.question?.questionType ?? a.questionType ?? '';
          return {
            questionId: a.questionId,
            questionText: a.question?.questionText ?? '',
            essayAnswer: a.essayAnswer ?? '',
            wordCount: a.wordCount ?? undefined,
            answerKey: a.question?.answerKey ?? null,
            score: String(a.score ?? ''),
            teacherFeedback: a.teacherFeedback ?? '',
            questionType: qt,
            maxScore: typeWeights[qt] ?? 1
          };
        });
      show = true;
    } catch (e) { formErr = e instanceof ApiError ? e.message : 'Gagal memuat jawaban'; }
  }
  async function saveGrades() {
    if (!detail) return;
    saving = true; formErr = '';
    const studentExamId = (detail.studentExam ?? detail).id;
    try {
      await api.post(`/grading/${studentExamId}/essays`, {
        grades: essays.map((g) => ({ questionId: g.questionId, score: g.score === '' ? null : Number(g.score), teacherFeedback: g.teacherFeedback || null }))
      });
      show = false; await load();
    } catch (e) { formErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { saving = false; }
  }
  async function dl(studentExamId: string) {
    try {
      await api.download(`/grading/${studentExamId}/export`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal mengunduh DOCX';
    }
  }

  const recapRows = $derived(
    recap.map((r) => {
      const se = r.studentExam ?? r;
      return {
        id: se?.id ?? r.studentExamId ?? r.id ?? '',
        studentName: se?.user?.name ?? se?.student?.name ?? r.studentName ?? '—',
        totalScore: se?.totalScore ?? r.totalScore ?? '—',
        status: se?.status ?? r.status ?? '—'
      };
    })
  );

  onMount(load);
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
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
  <DataTable
    rows={recapRows}
    searchKeys={['studentName', 'totalScore', 'status']}
    searchPlaceholder="Cari siswa, nilai, atau status…"
    columns={[
      { key: 'studentName', label: 'Siswa', sortable: true },
      { key: 'totalScore', label: 'Nilai', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'actions', label: 'Aksi', align: 'right' }
    ]}
  >
    {#snippet cell({ row, col })}
      {#if col.key === 'studentName'}
        <span class="font-medium text-foreground">{row.studentName}</span>
      {:else if col.key === 'totalScore'}
        <span class="text-right text-foreground">{row.totalScore}</span>
      {:else if col.key === 'status'}
        <Badge tone={row.status === 'WAITING_GRADING' ? 'warning' : 'primary'}>{row.status}</Badge>
      {:else if col.key === 'actions'}
        <div class="flex justify-end gap-2">
          <Button variant="outline" size="sm" onclick={() => dl(row.id)}><Download class="h-4 w-4" /> DOCX</Button>
          <Button variant="outline" size="sm" onclick={() => openGrade(row.id)}><Pencil class="h-4 w-4" /> Nilai Esai</Button>
        </div>
      {/if}
    {/snippet}
  </DataTable>
{/if}

{#if show && detail}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (show = false)} onkeydown={(e) => e.key === 'Escape' && (show = false)}>
    <Card class="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">Penilaian Esai / Uraian Pendek</h3>
        <button onclick={() => (show = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if formErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formErr}</p>{/if}
      {#if essays.length === 0}
        <p class="text-sm text-muted-foreground">Tidak ada soal esai/uraian pendek pada ujian ini.</p>
      {:else}
        <div class="space-y-4">
          {#each essays as g, i (g.questionId)}
            <div class="rounded-lg border border-border p-3">
              <p class="text-xs font-medium text-muted-foreground">Soal #{i + 1}</p>
              <div class="mt-1 text-sm text-foreground"><Html html={g.questionText} /></div>
              <div class="mt-2 rounded-lg bg-secondary/40 p-3">
                <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Jawaban siswa{g.wordCount != null ? ` (${g.wordCount} kata)` : ''}
                </p>
                {#if g.essayAnswer}
                  <div class="text-sm text-foreground"><Html html={g.essayAnswer} /></div>
                {:else}
                  <p class="text-sm italic text-muted-foreground">Kosong</p>
                {/if}
              </div>
              {#if g.answerKey}
                <p class="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kunci jawaban</p>
                <div class="mt-0.5 rounded-lg bg-emerald-50 p-3 text-sm text-foreground">{g.answerKey}</div>
              {/if}
              <label class="mt-2 block text-sm">Nilai (maks {g.maxScore})
                <input bind:value={g.score} type="number" min="0" max={g.maxScore} step="0.5" class="ml-2 h-9 w-24 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <textarea bind:value={g.teacherFeedback} rows="2" placeholder="Catatan (opsional)" class="mt-2 w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:ring-2 focus:ring-ring"></textarea>
            </div>
          {/each}
        </div>
      {/if}
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (show = false)}>Batal</Button>
        <Button onclick={saveGrades} disabled={saving || essays.length === 0}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan Nilai</Button>
      </div>
    </Card>
  </div>
{/if}
