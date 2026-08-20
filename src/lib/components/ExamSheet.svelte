<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { StartExamResponse, Question, Timer } from '$api/types';
  import Button from '$components/ui/Button.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Progress from '$components/ui/Progress.svelte';
  import QuestionNavigator from '$components/QuestionNavigator.svelte';
  import { PanelLeftClose, PanelLeftOpen, Flag, CheckCircle2, Loader2, Send, Wifi, WifiOff } from 'lucide-svelte';
  import { formatDuration, cn } from '$lib/utils';
  import Html from '$components/Html.svelte';
  import RichTextEditor from '$components/RichTextEditor.svelte';
  import { QUESTION_TYPE_LABELS as TL } from '$lib/questionTypes';

  let { studentExamId }: { studentExamId: string } = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let submitting = $state(false);
  let submitError = $state('');
  let exam = $state<StartExamResponse | null>(null);
  let currentId = $state<string>('');
  let collapsed = $state(false);
  let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
  let online = $state(true);

  // answers keyed by questionId
  let answers = $state<Record<string, { selectedOptionId?: string; selectedOptionIds: string[]; essayAnswer?: string; isFlagged: boolean }>>({});

  // timer
  let now = $state(Date.now());
  let serverOffset = $state(0); // serverNow - clientNow
  let schedulePaused = $state(false);

  const timer = $derived<Timer | null>(exam?.timer ?? null);
  const remainingMs = $derived(
    timer?.deadlineAt ? Math.max(0, timer.deadlineAt - (now + serverOffset)) : Infinity
  );
  const remainingSec = $derived(remainingMs === Infinity ? null : Math.floor(remainingMs / 1000));
  const expired = $derived(remainingSec !== null && remainingSec <= 0);

  const timerTone = $derived(
    remainingSec === null ? 'primary' : remainingSec > 900 ? 'success' : remainingSec > 300 ? 'warning' : 'danger'
  );

  function questionsState() {
    if (!exam) return [];
    return exam.questions.map((q, i) => {
      const a = answers[q.id];
      const answered =
        q.questionType === 'ESSAY'
          ? Boolean(a?.essayAnswer && a.essayAnswer.replace(/<[^>]*>/g, '').trim().length > 0)
          : q.questionType === 'MULTI_SELECT'
            ? (a?.selectedOptionIds.length ?? 0) > 0
            : Boolean(a?.selectedOptionId);
      return { id: q.id, index: i, answered, flagged: Boolean(a?.isFlagged) };
    });
  }

  function ensureAnswer(q: Question) {
    if (!answers[q.id]) {
      const saved = q.savedAnswers?.[0];
      answers[q.id] = {
        selectedOptionId: saved?.selectedOptionId ?? undefined,
        selectedOptionIds: saved?.selectedOptionId ? [saved.selectedOptionId] : [],
        essayAnswer: saved?.essayAnswer ?? '',
        isFlagged: saved?.isFlagged ?? false
      };
    }
    return answers[q.id];
  }

  // getter non-mutating (aman dipakai di render)
  function answerFor(q: Question) {
    return (
      answers[q.id] ?? {
        selectedOptionId: undefined,
        selectedOptionIds: [],
        essayAnswer: '',
        isFlagged: false
      }
    );
  }

  function toggleOption(q: Question, optId: string) {
    const a = ensureAnswer(q);
    if (q.questionType === 'MULTI_SELECT') {
      a.selectedOptionIds = a.selectedOptionIds.includes(optId)
        ? a.selectedOptionIds.filter((x) => x !== optId)
        : [...a.selectedOptionIds, optId];
      a.selectedOptionId = undefined;
    } else {
      a.selectedOptionId = optId;
      a.selectedOptionIds = [];
    }
    scheduleSave();
  }

  function setEssay(q: Question, html: string) {
    ensureAnswer(q).essayAnswer = html;
    scheduleSave();
  }

  function toggleFlag(q: Question) {
    ensureAnswer(q).isFlagged = !ensureAnswer(q).isFlagged;
    scheduleSave();
  }

  // --- Debounced auto-save ---
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    saveState = 'saving';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => doSave(), 6000);
  }

  async function doSave() {
    if (!exam) return;
    const payload = {
      answers: exam.questions.map((q) => {
        const a = answers[q.id] ?? {};
        return {
          questionId: q.id,
          selectedOptionId: q.questionType === 'MULTI_SELECT' ? undefined : a.selectedOptionId,
          selectedOptionIds: q.questionType === 'MULTI_SELECT' ? a.selectedOptionIds : undefined,
          essayAnswer: q.questionType === 'ESSAY' ? a.essayAnswer : undefined,
          isFlagged: a.isFlagged
        };
      })
    };
    try {
      await api.post(`/exams/${studentExamId}/answers`, payload);
      saveState = 'saved';
      setTimeout(() => {
        if (saveState === 'saved') saveState = 'idle';
      }, 2000);
    } catch {
      /* biarkan tetap 'saving' agar user tahu gagal; akan diulang */
    }
  }

  function countWords(html?: string): number {
    const text = (html ?? '').replace(/<[^>]*>/g, '').trim();
    return text ? text.split(/\s+/).length : 0;
  }

  // Cek kelengkapan + batasan kata esai sebelum submit.
  function validateRequirements(): { unanswered: number; problems: string[] } {
    if (!exam) return { unanswered: 0, problems: [] };
    let unanswered = 0;
    const problems: string[] = [];
    exam.questions.forEach((q, i) => {
      const a = answers[q.id];
      const label = `Soal ${i + 1}`;
      if (q.questionType === 'ESSAY') {
        const words = countWords(a?.essayAnswer);
        if (words === 0) {
          unanswered++;
        } else if (q.minWordCount != null && words < q.minWordCount) {
          problems.push(`${label}: esai ${words} kata, minimal ${q.minWordCount}`);
        } else if (q.maxWordCount != null && words > q.maxWordCount) {
          problems.push(`${label}: esai ${words} kata, maksimal ${q.maxWordCount}`);
        }
      } else if (q.questionType === 'MULTI_SELECT') {
        if ((a?.selectedOptionIds.length ?? 0) === 0) unanswered++;
      } else {
        if (!a?.selectedOptionId) unanswered++;
      }
    });
    return { unanswered, problems };
  }

  async function submit() {
    if (!exam) return;
    submitError = '';
    const { unanswered, problems } = validateRequirements();
    const warn = [
      unanswered > 0 ? `Masih ada ${unanswered} soal yang belum dijawab.` : '',
      ...problems.map((p) => `${p}.`)
    ]
      .filter(Boolean)
      .join('\n');
    if (warn) {
      const ok = confirm(`${warn}\n\nYakin ingin tetap mengumpulkan?`);
      if (!ok) return;
    } else if (!confirm('Yakin ingin mengumpulkan ujian? Tindakan tidak dapat dibatalkan.')) {
      return;
    }
    submitting = true;
    try {
      await doSave();
      await api.post(`/exams/${studentExamId}/submit`);
      location.href = `/student/result/${studentExamId}`;
    } catch (e) {
      submitError = e instanceof ApiError ? e.message : 'Gagal mengumpulkan ujian. Coba lagi.';
      submitting = false;
    }
  }

  let poll: ReturnType<typeof setInterval>;
  let tick: ReturnType<typeof setInterval>;

  onMount(async () => {
    // Di layar kecil (HP) sidebar navigasi memakan terlalu banyak ruang → collapse otomatis.
    if (typeof window !== 'undefined' && window.innerWidth < 768) collapsed = true;
    try {
      const res = await api.get<{ success: boolean; data: StartExamResponse }>(`/exams/${studentExamId}`);
      exam = (res as any).data;
      if (exam) {
        for (const q of exam.questions) ensureAnswer(q);
      }
      currentId = exam?.questions[0]?.id ?? '';
    } catch (e) {
      errorMsg = e instanceof ApiError ? e.message : 'Gagal memuat ujian';
    } finally {
      loading = false;
    }

    // sinkron jam server + cek deadline tiap 5 detik
    tick = setInterval(() => (now = Date.now()), 1000);
    poll = setInterval(async () => {
      try {
        const res = await api.get<{ data: { remainingSeconds: number; expired: boolean; deadlineAt: number; serverNow: number | string } }>(
          `/exams/${studentExamId}/time`
        );
        const t = (res as any)?.data ?? res;
        const serverNowMs = typeof t.serverNow === 'number' ? t.serverNow : Date.parse(t.serverNow);
        serverOffset = serverNowMs - Date.now();
        if (t.deadlineAt) {
          // pakai deadline resmi server
          exam && (exam.timer.deadlineAt = t.deadlineAt);
        }
        online = true;
        if (t.expired && !expired) submit();
      } catch {
        online = false;
      }
    }, 5000);
  });

  onDestroy(() => {
    if (poll) clearInterval(poll);
    if (tick) clearInterval(tick);
    if (saveTimer) clearTimeout(saveTimer);
  });

  const currentQuestion = $derived(exam?.questions.find((q) => q.id === currentId) ?? null);
</script>

{#if loading}
  <div class="grid h-[80vh] place-items-center text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /> Memuat ujian…</div>
{:else if errorMsg}
  <div class="grid h-[60vh] place-items-center text-rose-600">{errorMsg}</div>
{:else if exam}
  <div class="flex h-screen flex-col bg-background">
    <!-- Header ringkas -->
    <header class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-2.5 shadow-sm">
      <Button variant="ghost" size="icon" onclick={() => (collapsed = !collapsed)} title="Sembunyikan navigasi">
        {#if collapsed}<PanelLeftOpen class="h-5 w-5" />{:else}<PanelLeftClose class="h-5 w-5" />{/if}
      </Button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-sm font-semibold text-foreground">{exam.schedule.title}</h1>
        <p class="truncate text-xs text-muted-foreground">{exam.package.title}</p>
      </div>

      <div class="ml-auto flex flex-wrap items-center gap-3">
        <span class={cn('inline-flex items-center gap-1 text-xs', online ? 'text-emerald-600' : 'text-rose-600')}>
          {#if online}<Wifi class="h-4 w-4" />{:else}<WifiOff class="h-4 w-4" />{/if}
        </span>

        {#if timer?.hasTimer}
          <div
            class={cn(
              'rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums',
              timerTone === 'success' && 'bg-emerald-50 text-emerald-700',
              timerTone === 'warning' && 'bg-amber-50 text-amber-700',
              timerTone === 'danger' && 'animate-pulse-soft bg-rose-50 text-rose-600',
              timerTone === 'primary' && 'bg-secondary text-secondary-foreground'
            )}
          >
            {formatDuration(remainingSec)}
          </div>
        {:else}
          <Badge tone="muted">Tanpa batas waktu</Badge>
        {/if}

        {#if saveState === 'saving'}
          <span class="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 class="h-3.5 w-3.5 animate-spin" /> Menyimpan…</span>
        {:else if saveState === 'saved'}
          <span class="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 class="h-3.5 w-3.5" /> Tersimpan</span>
        {/if}

        <Button size="sm" onclick={submit} disabled={submitting}>
          {#if submitting}<Loader2 class="h-4 w-4 animate-spin" />{/if} Kumpulkan
        </Button>
      </div>
    </header>

    {#if submitError}
      <div class="bg-rose-50 px-4 py-2 text-center text-sm font-medium text-rose-700">{submitError}</div>
    {/if}

    {#if schedulePaused}
      <div class="bg-amber-50 px-4 py-1.5 text-center text-sm font-medium text-amber-700">Ujian dijeda oleh pengawas.</div>
    {/if}

    <div class="flex min-h-0 flex-1">
      <QuestionNavigator questions={questionsState()} currentId={currentId} collapsed={collapsed} onselect={(id) => (currentId = id)} />

      <main class="min-w-0 flex-1 overflow-y-auto px-5 py-6">
        {#if currentQuestion}
          {@const a = answerFor(currentQuestion)}
          <article class="mx-auto max-w-3xl">
            <div class="mb-4 flex items-start justify-between gap-3">
              <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Soal {exam.questions.findIndex((q) => q.id === currentQuestion.id) + 1} / {exam.questions.length}
                <Badge tone="primary" class="ml-2">{TL[currentQuestion.questionType]}</Badge>
              </span>
              <button onclick={() => toggleFlag(currentQuestion)} class={cn('inline-flex items-center gap-1 text-xs', a.isFlagged ? 'text-amber-600' : 'text-muted-foreground')}>
                <Flag class="h-4 w-4" /> {a.isFlagged ? 'Ditandai' : 'Tandai'}
              </button>
            </div>

            <div class="prose prose-slate max-w-none text-[15px] leading-relaxed text-foreground">
              <Html html={currentQuestion.questionText} />
            </div>

            {#if currentQuestion.questionType === 'ESSAY'}
              <div class="mt-4">
                {#key currentQuestion.id}
                  <RichTextEditor
                    value={a.essayAnswer}
                    onChange={(h) => setEssay(currentQuestion, h)}
                    placeholder="Tulis esai Anda… (rumus, tabel & gambar didukung)"
                    minWordCount={currentQuestion.minWordCount ?? null}
                    maxWordCount={currentQuestion.maxWordCount ?? null}
                    showFlash={false}
                  />
                {/key}
                {#if currentQuestion.minWordCount || currentQuestion.maxWordCount}
                  <p class="mt-1 text-xs text-muted-foreground">
                    Batas kata: {currentQuestion.minWordCount ?? 0}–{currentQuestion.maxWordCount ?? '∞'}
                  </p>
                {/if}
              </div>
            {:else}
              <div class="mt-4 space-y-2.5">
                {#each currentQuestion.options as opt (opt.id)}
                  {@const checked =
                    currentQuestion.questionType === 'MULTI_SELECT'
                      ? a.selectedOptionIds.includes(opt.id)
                      : a.selectedOptionId === opt.id}
                  <label
                    class={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                      checked ? 'border-primary bg-indigo-50/60' : 'border-border bg-card hover:bg-accent'
                    )}
                  >
                    <input
                      type={currentQuestion.questionType === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
                      name={currentQuestion.id}
                      class="mt-1 accent-[hsl(var(--primary))]"
                      checked={checked}
                      onchange={() => toggleOption(currentQuestion, opt.id)}
                    />
                    <span class="prose prose-sm max-w-none text-[15px] leading-relaxed"><Html html={opt.optionText} tag="span" /></span>
                  </label>
                {/each}
              </div>
            {/if}

            <div class="mt-6 flex justify-between">
              <Button variant="outline" disabled={exam.questions.findIndex((q) => q.id === currentId) === 0} onclick={() => {
                const i = exam!.questions.findIndex((q) => q.id === currentId);
                currentId = exam!.questions[i - 1].id;
              }}>Sebelumnya</Button>
              <Button disabled={exam.questions.findIndex((q) => q.id === currentId) === exam.questions.length - 1} onclick={() => {
                const i = exam!.questions.findIndex((q) => q.id === currentId);
                currentId = exam!.questions[i + 1].id;
              }}>Selanjutnya</Button>
            </div>
          </article>
        {/if}

        <Progress class="mt-8" value={questionsState().filter((q) => q.answered).length} max={exam.questions.length} />
      </main>
    </div>
  </div>
{/if}
