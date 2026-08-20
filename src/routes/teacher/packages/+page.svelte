<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { QuestionType } from '$api/types';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Plus, Pencil, Trash2, X, Clock, Layers, Download } from 'lucide-svelte';
  import ExcelImportButton from '$components/ExcelImportButton.svelte';
  import Html from '$components/Html.svelte';
  import { importPackages } from '$lib/imports';
  import { QUESTION_TYPE_LABELS as TL } from '$lib/questionTypes';

  interface Subject { id: string; name: string; topics?: { id: string; name: string }[] }
  interface Pkg { id: string; title: string; subjectId?: string | null; subject?: { name?: string }; hasTimer?: boolean; durationMinutes?: number | null; passScore?: string | null; questionCount?: number; questionTypeCounts?: Record<string, number> }

  function pkgBreakdown(p: Pkg) {
    return Object.entries(p.questionTypeCounts ?? {})
      .map(([t, n]) => `${n} ${TL[t as QuestionType]}`)
      .join(' · ');
  }

  let packages = $state<Pkg[]>([]);
  let subjects = $state<Subject[]>([]);
  let loading = $state(true);
  let error = $state('');

  let show = $state(false);
  let editing = $state<Pkg | null>(null);
  let f = $state({ title: '', subjectId: '', hasTimer: true, durationMinutes: '', passScore: '', isRandomQuestions: true, isRandomOptions: false });
  let saving = $state(false);
  let formErr = $state('');

  let manageShow = $state(false);
  let managePkg = $state<Pkg | null>(null);
  let manageSubjectId = $state('');
  let manageTopics = $state<{ id: string; name: string }[]>([]);
  let manageSelectedTopics = $state<Record<string, boolean>>({});
  let manageQuestionsByTopic = $state<Record<string, { id: string; questionText: string; questionType: string }[]>>({});
  let manageSelected = $state<Record<string, boolean>>({});
  let manageLoading = $state(false);
  let manageSaving = $state(false);
  let manageErr = $state('');

  async function load() {
    loading = true; error = '';
    try {
      const [pr, sr] = await Promise.all([
        api.get<{ data: Pkg[] }>('/packages'),
        api.get<{ data: Subject[] }>('/subjects')
      ]);
      packages = ((pr as any).data ?? []) as Pkg[];
      subjects = ((sr as any).data ?? []) as Subject[];
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }

  function openCreate() {
    editing = null;
    f = { title: '', subjectId: subjects[0]?.id ?? '', hasTimer: true, durationMinutes: '', passScore: '', isRandomQuestions: true, isRandomOptions: false };
    formErr = ''; show = true;
  }
  function openEdit(p: Pkg) {
    editing = p;
    f = { title: p.title, subjectId: p.subjectId ?? '', hasTimer: Boolean(p.hasTimer), durationMinutes: String(p.durationMinutes ?? ''), passScore: String(p.passScore ?? ''), isRandomQuestions: true, isRandomOptions: false };
    formErr = ''; show = true;
  }
  async function save() {
    saving = true; formErr = '';
    const body: any = {
      title: f.title,
      subjectId: f.subjectId || null,
      hasTimer: f.hasTimer,
      durationMinutes: f.durationMinutes ? Number(f.durationMinutes) : null,
      passScore: f.passScore ? String(f.passScore) : null,
      isRandomQuestions: f.isRandomQuestions,
      isRandomOptions: f.isRandomOptions
    };
    try {
      if (editing) await api.put(`/packages/${editing.id}`, body);
      else await api.post('/packages', body);
      show = false; await load();
    } catch (e) { formErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { saving = false; }
  }
  async function del(p: Pkg) {
    if (!confirm(`Hapus paket "${p.title}"?`)) return;
    await api.del(`/packages/${p.id}`); await load();
  }
  async function dl(p: Pkg) {
    try {
      await api.download(`/packages/${p.id}/export`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal mengunduh DOCX';
    }
  }
  async function openManage(p: Pkg) {
    managePkg = p;
    manageErr = '';
    manageLoading = true;
    manageShow = true;
    try {
      const res = await api.get<any>(`/packages/${p.id}`);
      const data = (res as any)?.data ?? res;
      const current = (data?.packageQuestions ?? [])
        .map((pq: any) => pq.question?.id)
        .filter(Boolean);
      manageSelected = Object.fromEntries(current.map((id: string) => [id, true]));
      applyManageSubject(p.subjectId ?? subjects[0]?.id ?? '');
    } catch (e) {
      manageErr = e instanceof ApiError ? e.message : 'Gagal memuat paket';
    } finally {
      manageLoading = false;
    }
  }
  function applyManageSubject(subjectId: string) {
    manageSubjectId = subjectId;
    manageTopics = subjects.find((s) => s.id === subjectId)?.topics ?? [];
    manageSelectedTopics = {};
    manageQuestionsByTopic = {};
    if (manageTopics.length) toggleTopic(manageTopics[0].id);
  }
  async function toggleTopic(topicId: string) {
    if (manageSelectedTopics[topicId]) {
      // nonaktifkan topik → hapus dari tampilan & batalkan seleksi soalnya
      const topics = { ...manageSelectedTopics };
      delete topics[topicId];
      manageSelectedTopics = topics;
      const removed = manageQuestionsByTopic[topicId] ?? [];
      const byTopic = { ...manageQuestionsByTopic };
      delete byTopic[topicId];
      manageQuestionsByTopic = byTopic;
      const sel = { ...manageSelected };
      removed.forEach((q) => delete sel[q.id]);
      manageSelected = sel;
      return;
    }
    manageSelectedTopics = { ...manageSelectedTopics, [topicId]: true };
    try {
      const res = await api.get<any>(`/questions?topicId=${topicId}`);
      const qs = (Array.isArray(res) ? res : (res as any)?.data ?? []) as any[];
      manageQuestionsByTopic = { ...manageQuestionsByTopic, [topicId]: qs };
    } catch {
      manageQuestionsByTopic = { ...manageQuestionsByTopic, [topicId]: [] };
    }
  }
  function topicAllChecked(topicId: string) {
    const qs = manageQuestionsByTopic[topicId] ?? [];
    return qs.length > 0 && qs.every((q) => manageSelected[q.id]);
  }
  function toggleTopicAll(topicId: string) {
    const qs = manageQuestionsByTopic[topicId] ?? [];
    const target = !topicAllChecked(topicId);
    const next = { ...manageSelected };
    qs.forEach((q) => {
      if (target) next[q.id] = true;
      else delete next[q.id];
    });
    manageSelected = next;
  }
  function toggleSelect(id: string) {
    const next = { ...manageSelected };
    if (next[id]) delete next[id];
    else next[id] = true;
    manageSelected = next;
  }
  function selectedCountInTopic(topicId: string) {
    return (manageQuestionsByTopic[topicId] ?? []).filter((q) => manageSelected[q.id]).length;
  }
  const manageSelectedTypes = $derived((() => {
    const typeOf: Record<string, string> = {};
    for (const qs of Object.values(manageQuestionsByTopic)) for (const q of qs) typeOf[q.id] = q.questionType;
    const counts: Record<string, number> = {};
    for (const id of Object.keys(manageSelected)) if (typeOf[id]) counts[typeOf[id]] = (counts[typeOf[id]] ?? 0) + 1;
    return counts;
  })());
  async function saveManage() {
    if (!managePkg) return;
    manageSaving = true;
    manageErr = '';
    try {
      await api.put(`/packages/${managePkg.id}`, { questionIds: Object.keys(manageSelected) });
      manageShow = false;
      await load();
    } catch (e) {
      manageErr = e instanceof ApiError ? e.message : 'Gagal menyimpan';
    } finally {
      manageSaving = false;
    }
  }
  async function onImportPackages(rows: any[]) {
    const r = await importPackages(rows, subjects as any);
    await load();
    return r;
  }

  onMount(load);
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 class="text-xl font-bold text-foreground">Paket Soal</h1>
    <p class="text-sm text-muted-foreground">Kumpulan soal untuk satu sesi ujian.</p>
  </div>
  <Button onclick={openCreate}><Plus class="h-4 w-4" /> Paket</Button>
</div>
<div class="mb-4 flex flex-wrap items-center gap-3">
  <ExcelImportButton label="Import Paket (Excel)" templateName="template_paket.xlsx"
    templateHeaders={['mapel','judul','durasi','pass','acak_soal','acak_opsi']}
    templateSample={{ mapel: 'MTK', judul: 'UTS Ganjil', durasi: 60, pass: 60, acak_soal: 'Y', acak_opsi: 'N' }}
    onImport={onImportPackages} />
  <span class="text-xs text-muted-foreground">Kolom: mapel, judul, durasi (menit), pass (nilai lulus), acak_soal (Y/N), acak_opsi (Y/N).</span>
</div>
{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if packages.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada paket soal.</Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each packages as p (p.id)}
      <Card class="flex flex-col p-5">
        <div class="mb-1 flex items-start justify-between gap-2">
          <h3 class="font-semibold text-foreground">{p.title}</h3>
          <div class="flex gap-1">
            <Button variant="ghost" size="icon" onclick={() => openManage(p)} title="Kelola Soal"><Layers class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onclick={() => dl(p)} title="Download DOCX"><Download class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onclick={() => openEdit(p)} title="Edit"><Pencil class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onclick={() => del(p)} title="Hapus"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
          </div>
        </div>
        <p class="text-sm text-muted-foreground">{p.subject?.name ?? subjects.find((s) => s.id === p.subjectId)?.name ?? '—'}</p>
        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          {#if p.hasTimer}<Badge tone="muted"><Clock class="h-3 w-3" /> {p.durationMinutes ?? '?'} mnt</Badge>{/if}
          {#if p.passScore != null}<Badge tone="muted">Pass {p.passScore}</Badge>{/if}
          {#if p.questionCount != null}<Badge tone="muted"><Layers class="h-3 w-3" /> {p.questionCount} soal</Badge>{/if}
        </div>
        {#if p.questionCount != null && Object.keys(p.questionTypeCounts ?? {}).length}
          <p class="mt-2 text-xs text-muted-foreground">{pkgBreakdown(p)}</p>
        {/if}
      </Card>
    {/each}
  </div>
{/if}

{#if show}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (show = false)} onkeydown={(e) => e.key === 'Escape' && (show = false)}>
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editing ? 'Edit' : 'Tambah'} Paket</h3>
        <button onclick={() => (show = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if formErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formErr}</p>{/if}
      <div class="space-y-3">
        <label class="block"><span class="mb-1 block text-sm font-medium">Judul</span><input bind:value={f.title} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Mata Pelajaran</span>
          <select bind:value={f.subjectId} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">—</option>
            {#each subjects as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="mb-1 block text-sm font-medium">Durasi (mnt)</span><input bind:value={f.durationMinutes} type="number" class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label class="block"><span class="mb-1 block text-sm font-medium">Nilai Lulus</span><input bind:value={f.passScore} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        </div>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={f.hasTimer} class="accent-[hsl(var(--primary))]" /> Ada batas waktu</label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={f.isRandomQuestions} class="accent-[hsl(var(--primary))]" /> Acak soal</label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={f.isRandomOptions} class="accent-[hsl(var(--primary))]" /> Acak opsi</label>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (show = false)}>Batal</Button>
        <Button onclick={save} disabled={saving}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}

{#if manageShow}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (manageShow = false)} onkeydown={(e) => e.key === 'Escape' && (manageShow = false)}>
    <Card class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
      <div class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-base font-semibold text-foreground">Kelola Soal — {managePkg?.title}</h3>
        <button onclick={() => (manageShow = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if manageErr}<p class="mx-5 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{manageErr}</p>{/if}
      <div class="grid gap-3 border-b border-border px-5 py-3">
        <label class="block"><span class="mb-1 block text-sm font-medium">Mapel</span>
          <select bind:value={manageSubjectId} onchange={() => applyManageSubject(manageSubjectId)} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {#each subjects as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
          </select>
        </label>
        <div>
          <span class="mb-1.5 block text-sm font-medium">Topik <span class="font-normal text-muted-foreground">(boleh lebih dari satu)</span></span>
          {#if manageTopics.length === 0}
            <p class="text-sm text-muted-foreground">Tidak ada topik untuk mapel ini.</p>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each manageTopics as t (t.id)}
                <button type="button" onclick={() => toggleTopic(t.id)}
                  class={manageSelectedTopics[t.id]
                    ? 'rounded-full border border-primary bg-primary px-3 py-1 text-sm font-medium text-primary-foreground'
                    : 'rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground hover:bg-accent'}>
                  {t.name}
                  {#if manageSelectedTopics[t.id]}
                    <span class="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold">{selectedCountInTopic(t.id)}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-1 px-5 py-2 text-sm text-muted-foreground">
        <span>Pilih soal per topik</span>
        <span class="font-medium text-foreground">
          {Object.keys(manageSelected).length} soal dipilih
          {#if Object.keys(manageSelectedTypes).length}
            <span class="font-normal text-muted-foreground">({Object.entries(manageSelectedTypes).map(([t, n]) => `${n} ${TL[t as QuestionType]}`).join(' · ')})</span>
          {/if}
        </span>
      </div>
      <div class="min-h-[220px] flex-1 space-y-2 overflow-y-auto px-5 py-3">
        {#if manageLoading}
          <div class="grid place-items-center py-10 text-muted-foreground"><Loader2 class="h-5 w-5 animate-spin" /></div>
        {:else if Object.keys(manageSelectedTopics).length === 0}
          <p class="py-8 text-center text-sm text-muted-foreground">Pilih minimal satu topik untuk menampilkan soal.</p>
        {:else}
          {#each Object.keys(manageSelectedTopics) as tid (tid)}
            <div class="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-1.5">
              <span class="text-sm font-semibold text-foreground">
                {manageTopics.find((t) => t.id === tid)?.name ?? 'Topik'}
                <span class="ml-1 font-normal text-muted-foreground">({(manageQuestionsByTopic[tid] ?? []).length} soal)</span>
              </span>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={topicAllChecked(tid)} onchange={() => toggleTopicAll(tid)} class="accent-[hsl(var(--primary))]" />
                Semua
              </label>
            </div>
            {#if !manageQuestionsByTopic[tid]}
              <p class="px-1 text-sm text-muted-foreground">Memuat…</p>
            {:else if manageQuestionsByTopic[tid].length === 0}
              <p class="px-1 text-sm text-muted-foreground">Tidak ada soal di topik ini.</p>
            {:else}
              {#each manageQuestionsByTopic[tid] as q (q.id)}
                <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-accent">
                  <input type="checkbox" checked={!!manageSelected[q.id]} onchange={() => toggleSelect(q.id)} class="mt-1 accent-[hsl(var(--primary))]" />
                  <span class="min-w-0 flex-1">
                    <span class="mb-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">{TL[q.questionType as QuestionType]}</span>
                    <Html html={q.questionText} class="text-sm text-foreground" />
                  </span>
                </label>
              {/each}
            {/if}
          {/each}
        {/if}
      </div>
      <div class="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="outline" onclick={() => (manageShow = false)}>Batal</Button>
        <Button onclick={saveManage} disabled={manageSaving}>{#if manageSaving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}
