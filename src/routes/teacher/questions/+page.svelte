<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { QuestionType } from '$api/types';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Plus, Pencil, Trash2, X, ListTree } from 'lucide-svelte';
  import RichTextEditor from '$components/RichTextEditor.svelte';
  import ExcelImportButton from '$components/ExcelImportButton.svelte';
  import Html from '$components/Html.svelte';
  import { importQuestions } from '$lib/imports';
  import { QUESTION_TYPE_LABELS as TL, QUESTION_TYPE_HINTS as TH } from '$lib/questionTypes';

  interface Topic { id: string; name: string; subjectId: string }
  interface Subject { id: string; name: string; topics: Topic[] }
  interface Opt { id?: string; optionText: string; scoreWeight?: string }
  interface Question { id: string; questionText: string; questionType: QuestionType; minWordCount?: number | null; maxWordCount?: number | null; answerKey?: string | null; options: Opt[] }

  const TYPES: QuestionType[] = ['MCQ', 'ESSAY', 'TRUE_FALSE', 'POLY_CHOICE', 'MULTI_SELECT', 'URAIAN_PENDEK'];

  function isBenar(o: Opt) { return Number(o.scoreWeight ?? 0) > 0; }
  function kunciOf(q: Question) {
    return q.options.map((o, i) => (isBenar(o) ? String.fromCharCode(65 + i) : '')).filter(Boolean).join(', ');
  }

  // Editor rich text mengembalikan HTML; paragraf kosong ("<p></p>") tidak dihitung sebagai opsi.
  function isBlankHtml(html: string) {
    if (!html) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return !(tmp.textContent || '').trim() && !tmp.querySelector('img, .math-latex');
  }

  let subjects = $state<Subject[]>([]);
  let topicId = $state<string>($page.url.searchParams.get('topicId') ?? '');
  let questions = $state<Question[]>([]);
  let loading = $state(true);
  let error = $state('');

  let show = $state(false);
  let editing = $state<Question | null>(null);
  let f = $state({ questionText: '', questionType: 'MCQ' as QuestionType, minWordCount: '', maxWordCount: '', answerKey: '', options: [{ optionText: '' }] as Opt[] });
  let saving = $state(false);
  let formErr = $state('');

  async function loadSubjects() {
    const res = await api.get<{ data: Subject[] }>('/subjects', { limit: 10000 });
    subjects = ((res as any).data ?? []) as Subject[];
  }
  async function loadQuestions() {
    if (!topicId) { questions = []; loading = false; return; }
    loading = true; error = '';
    try {
      const res = await api.get<Question[]>(`/questions?topicId=${topicId}`);
      questions = (Array.isArray(res) ? res : ((res as any).data ?? [])) as Question[];
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }

  function topicsFlat() { return subjects.flatMap((s) => s.topics.map((t) => ({ ...t, subjectName: s.name }))); }

  function openCreate() {
    editing = null;
    f = { questionText: '', questionType: 'MCQ', minWordCount: '', maxWordCount: '', answerKey: '', options: [{ optionText: '', scoreWeight: '0' }] };
    formErr = ''; show = true;
  }
  function openEdit(q: Question) {
    editing = q;
    f = { questionText: q.questionText, questionType: q.questionType, minWordCount: String(q.minWordCount ?? ''), maxWordCount: String(q.maxWordCount ?? ''), answerKey: q.answerKey ?? '', options: q.options.length ? q.options.map((o) => ({ id: o.id, optionText: o.optionText, scoreWeight: String(o.scoreWeight ?? '0') })) : [{ optionText: '', scoreWeight: '0' }] };
    formErr = ''; show = true;
  }
  function addOpt() { f.options = [...f.options, { optionText: '', scoreWeight: '0' }]; }
  function delOpt(i: number) { f.options = f.options.filter((_, idx) => idx !== i); }
  function onTypeChange() {
    if (f.questionType === 'ESSAY' || f.questionType === 'URAIAN_PENDEK') f.options = [];
    else if (f.options.length === 0) f.options = [{ optionText: '' }];
  }
  async function save() {
    saving = true; formErr = '';
    const hasBenar = f.options.some((o) => Number(o.scoreWeight ?? 0) > 0);
    if ((f.questionType === 'MCQ' || f.questionType === 'TRUE_FALSE' || f.questionType === 'POLY_CHOICE') && !hasBenar) {
      formErr = 'Tandai minimal satu jawaban sebagai "Benar" agar koreksi otomatis berjalan.';
      saving = false;
      return;
    }
    const body: any = {
      topicId,
      questionText: f.questionText,
      questionType: f.questionType
    };
    if (f.minWordCount !== '') body.minWordCount = Number(f.minWordCount);
    if (f.maxWordCount !== '') body.maxWordCount = Number(f.maxWordCount);
    if (f.questionType !== 'ESSAY' && f.questionType !== 'URAIAN_PENDEK') body.options = f.options.filter((o) => !isBlankHtml(o.optionText)).map((o) => ({ optionText: o.optionText, scoreWeight: Number(o.scoreWeight ?? 0) }));
    if (f.questionType === 'URAIAN_PENDEK') body.answerKey = f.answerKey || null;
    try {
      if (editing) await api.put(`/questions/${editing.id}`, body);
      else await api.post('/questions', body);
      show = false; await loadQuestions();
    } catch (e) { formErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { saving = false; }
  }
  async function del(q: Question) {
    if (!confirm('Hapus soal ini?')) return;
    await api.del(`/questions/${q.id}`); await loadQuestions();
  }
  async function onImportQuestions(rows: any[]) {
    const r = await importQuestions(rows, subjects as any);
    if (topicId) await loadQuestions();
    return r;
  }

  onMount(async () => { await loadSubjects(); await loadQuestions(); });
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 class="text-xl font-bold text-foreground">Bank Soal — Soal</h1>
    <p class="text-sm text-muted-foreground">Pilih topik, lalu kelola soal & opsi jawaban.</p>
  </div>
  <Button onclick={openCreate} disabled={!topicId}><Plus class="h-4 w-4" /> Soal</Button>
</div>

<div class="mb-4 flex flex-wrap items-center gap-3">
  <ExcelImportButton label="Import Soal (Excel)" templateName="template_soal.xlsx"
    templateHeaders={['mapel','topik','tipe','soal','a','b','c','d','e','kunci','min_kata','max_kata']}
    templateSample={{ mapel: 'MTK', topik: 'Aljabar', tipe: 'MCQ', soal: 'Berapakah 2 + 2?', a: '3', b: '4', c: '5', d: '', e: '', kunci: 'b', min_kata: '', max_kata: '' }}
    onImport={onImportQuestions} />
  <span class="text-xs text-muted-foreground">Kolom: mapel, topik, tipe, soal, a–e, kunci (huruf kunci, pisah koma untuk multi), min_kata, max_kata.</span>
</div>

<label class="mb-4 block max-w-md">
  <span class="mb-1 block text-sm font-medium">Topik</span>
  <select bind:value={topicId} onchange={loadQuestions} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
    <option value="">— Pilih topik —</option>
    {#each topicsFlat() as t (t.id)}<option value={t.id}>{t.subjectName} › {t.name}</option>{/each}
  </select>
</label>

{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if !topicId}
  <Card class="p-8 text-center text-muted-foreground">Pilih topik terlebih dahulu.</Card>
{:else if questions.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada soal di topik ini.</Card>
{:else}
  <div class="space-y-3">
    {#each questions as q, i (q.id)}
      <Card class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Soal {i + 1} <Badge tone="primary" class="ml-1">{TL[q.questionType]}</Badge></p>
            <Html html={q.questionText} class="mt-0.5 text-sm text-foreground" />
            {#if q.options.length}
              <p class="mt-1 text-xs text-muted-foreground">
                {q.options.length} opsi
                {#if q.questionType === 'POLY_CHOICE'}
                  · Bobot: {q.options.map((o) => Number(o.scoreWeight ?? 0)).join(', ')}
                {:else if q.questionType !== 'ESSAY'}
                  · Kunci: {kunciOf(q) || '—'}
                {/if}
              </p>
            {/if}
          </div>
          {#if q.questionType === 'URAIAN_PENDEK' && q.answerKey}
            <p class="mt-1 text-xs text-muted-foreground">Kunci: {q.answerKey}</p>
          {/if}
          <div class="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onclick={() => openEdit(q)} title="Edit"><Pencil class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onclick={() => del(q)} title="Hapus"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
          </div>
        </div>
      </Card>
    {/each}
  </div>
{/if}

{#if show}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (show = false)} onkeydown={(e) => e.key === 'Escape' && (show = false)}>
    <Card class="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editing ? 'Edit' : 'Tambah'} Soal</h3>
        <button onclick={() => (show = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if formErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formErr}</p>{/if}
      <div class="space-y-3">
        <div>
          <span class="mb-1 block text-sm font-medium">Teks Soal</span>
          <RichTextEditor value={f.questionText} onChange={(h) => (f.questionText = h)} placeholder="Tulis teks soal (rumus & gambar didukung)…" />
        </div>
        <label class="block"><span class="mb-1 block text-sm font-medium">Tipe</span>
          <select bind:value={f.questionType} onchange={onTypeChange} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {#each TYPES as t}<option value={t}>{TL[t]}</option>{/each}
          </select>
          <p class="mt-1 text-[11px] text-muted-foreground">{TH[f.questionType]}</p>
        </label>
        {#if f.questionType === 'ESSAY'}
          <div class="grid grid-cols-2 gap-3">
            <label class="block"><span class="mb-1 block text-sm font-medium">Min kata</span><input bind:value={f.minWordCount} type="number" class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
            <label class="block"><span class="mb-1 block text-sm font-medium">Max kata</span><input bind:value={f.maxWordCount} type="number" class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          </div>
        {:else if f.questionType === 'URAIAN_PENDEK'}
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Kunci Jawaban</span>
            <textarea bind:value={f.answerKey} rows="3" placeholder="Kunci jawaban (rujukan guru saat menilai)…" class="w-full rounded-lg border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"></textarea>
          </label>
        {:else}
          <div>
            <div class="mb-1 flex items-center justify-between"><span class="text-sm font-medium">Opsi Jawaban</span><Button variant="outline" size="sm" onclick={addOpt}><Plus class="h-3.5 w-3.5" /> Opsi</Button></div>
            <div class="space-y-2">
              {#each f.options as o, idx (idx)}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                  {#if f.questionType === 'TRUE_FALSE'}
                    <input bind:value={o.optionText} class="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Teks opsi" />
                  {:else}
                    <div class="min-w-0 flex-1">
                      <RichTextEditor
                        compact
                        value={o.optionText}
                        onChange={(h) => (o.optionText = h)}
                        placeholder="Teks opsi (rumus didukung)…"
                        showFlash={false}
                      />
                    </div>
                  {/if}
                  {#if f.questionType === 'POLY_CHOICE'}
                    <label class="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground" title="Tandai jawaban benar (bobot 1)">
                      <input type="checkbox" checked={isBenar(o)} onchange={(e: Event) => (o.scoreWeight = (e.currentTarget as HTMLInputElement).checked ? '1' : '0')} class="h-4 w-4 accent-primary" />
                      Benar
                    </label>
                  {:else}
                    <label class="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground" title="Tandai opsi ini sebagai kunci jawaban">
                      <input type="checkbox" checked={isBenar(o)} onchange={(e: Event) => (o.scoreWeight = (e.currentTarget as HTMLInputElement).checked ? '1' : '0')} class="h-4 w-4 accent-primary" />
                      Kunci
                    </label>
                  {/if}
                  {#if f.questionType === 'POLY_CHOICE'}
                    <input type="number" min="0" step="0.5" value={o.scoreWeight} oninput={(e: Event) => (o.scoreWeight = (e.currentTarget as HTMLInputElement).value)} class="h-10 w-20 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Bobot" title="Bobot jawaban (1 = benar; untuk skala/psikologi isi 0-4 dst.)" />
                  {/if}
                  <Button variant="ghost" size="icon" onclick={() => delOpt(idx)} disabled={f.options.length === 1}><Trash2 class="h-4 w-4 text-rose-600" /></Button>
                </div>
              {/each}
            </div>
            <p class="mt-2 text-[11px] text-muted-foreground">
              {f.questionType === 'POLY_CHOICE'
                ? 'Centang "Benar" & isi bobot (1 = benar, 0 = salah, 0.5 = parsial). Skor = jumlah bobot opsi terpilih (tanpa pengali).'
                : f.questionType === 'MULTI_SELECT'
                  ? 'Boleh memilih lebih dari satu; centang "Kunci" pada semua opsi benar. Skor tetap 1 (tanpa pengali) jika semua kunci tepat, else 0.'
                  : 'Centang "Kunci" pada opsi benar. Skor = pengali paket jika tepat, else 0.'}
            </p>
          </div>
        {/if}
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (show = false)}>Batal</Button>
        <Button onclick={save} disabled={saving}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}
