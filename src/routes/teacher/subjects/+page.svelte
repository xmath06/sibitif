<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Plus, Pencil, Trash2, BookOpen, ListTree, X } from 'lucide-svelte';

  interface Topic { id: string; name: string; questionCount?: number }
  interface Subject { id: string; code: string; name: string; topics: Topic[] }

  let subjects = $state<Subject[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showSubj = $state(false);
  let editingSubj = $state<Subject | null>(null);
  let subj = $state({ code: '', name: '' });
  let savingSubj = $state(false);
  let subjErr = $state('');

  let showTopic = $state(false);
  let topicSubjectId = $state('');
  let topicName = $state('');
  let savingTopic = $state(false);
  let topicErr = $state('');

  async function load() {
    loading = true; error = '';
    try {
      const res = await api.get<{ data: Subject[] }>('/subjects');
      subjects = ((res as any).data ?? []) as Subject[];
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }

  function openSubj(s?: Subject) {
    editingSubj = s ?? null;
    subj = s ? { code: s.code, name: s.name } : { code: '', name: '' };
    subjErr = ''; showSubj = true;
  }
  async function saveSubj() {
    savingSubj = true; subjErr = '';
    try {
      if (editingSubj) await api.put(`/subjects/${editingSubj.id}`, subj);
      else await api.post('/subjects', subj);
      showSubj = false; await load();
    } catch (e) { subjErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { savingSubj = false; }
  }
  async function delSubj(s: Subject) {
    if (!confirm(`Hapus mata pelajaran "${s.name}"?`)) return;
    await api.del(`/subjects/${s.id}`); await load();
  }

  function openTopic(subjectId: string) {
    topicSubjectId = subjectId; topicName = ''; topicErr = ''; showTopic = true;
  }
  async function saveTopic() {
    savingTopic = true; topicErr = '';
    try {
      await api.post('/topics', { subjectId: topicSubjectId, name: topicName });
      showTopic = false; await load();
    } catch (e) { topicErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { savingTopic = false; }
  }
  async function delTopic(subjectId: string, t: Topic) {
    if (!confirm(`Hapus topik "${t.name}"?`)) return;
    await api.del(`/topics/${t.id}`); await load();
  }

  onMount(load);
</script>

<div class="mb-5 flex items-center justify-between">
  <div>
    <h1 class="text-xl font-bold text-foreground">Bank Soal — Mata Pelajaran</h1>
    <p class="text-sm text-muted-foreground">Kelola mapel & topik. Soal dikelola per topik.</p>
  </div>
  <Button onclick={() => openSubj()}><Plus class="h-4 w-4" /> Mata Pelajaran</Button>
</div>
{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if subjects.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada mata pelajaran.</Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each subjects as s (s.id)}
      <Card class="flex flex-col p-5">
        <div class="mb-1 flex items-start justify-between gap-2">
          <div>
            <p class="text-xs font-mono text-muted-foreground">{s.code}</p>
            <h3 class="font-semibold text-foreground">{s.name}</h3>
          </div>
          <div class="flex gap-1">
            <Button variant="ghost" size="icon" onclick={() => openSubj(s)} title="Edit"><Pencil class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onclick={() => delSubj(s)} title="Hapus"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
          </div>
        </div>
        <div class="mt-2 space-y-1.5">
          {#each s.topics as t (t.id)}
            <div class="flex items-center justify-between rounded-lg bg-accent/60 px-3 py-1.5 text-sm">
              <span class="inline-flex items-center gap-1.5 text-foreground"><ListTree class="h-3.5 w-3.5 text-muted-foreground" />{t.name}</span>
              <div class="flex items-center gap-1">
                <a href={`/teacher/questions?topicId=${t.id}`} class="text-xs font-medium text-primary hover:underline">Soal</a>
                <button onclick={() => delTopic(s.id, t)} class="text-rose-600"><Trash2 class="h-3.5 w-3.5" /></button>
              </div>
            </div>
          {/each}
        </div>
        <Button variant="outline" size="sm" class="mt-3" onclick={() => openTopic(s.id)}><Plus class="h-3.5 w-3.5" /> Topik</Button>
      </Card>
    {/each}
  </div>
{/if}

{#if showSubj}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (showSubj = false)} onkeydown={(e) => e.key === 'Escape' && (showSubj = false)}>
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editingSubj ? 'Edit' : 'Tambah'} Mata Pelajaran</h3>
        <button onclick={() => (showSubj = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if subjErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{subjErr}</p>{/if}
      <div class="space-y-3">
        <label class="block"><span class="mb-1 block text-sm font-medium">Kode</span><input bind:value={subj.code} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Nama</span><input bind:value={subj.name} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showSubj = false)}>Batal</Button>
        <Button onclick={saveSubj} disabled={savingSubj}>{#if savingSubj}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}

{#if showTopic}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (showTopic = false)} onkeydown={(e) => e.key === 'Escape' && (showTopic = false)}>
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">Tambah Topik</h3>
        <button onclick={() => (showTopic = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if topicErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{topicErr}</p>{/if}
      <label class="block"><span class="mb-1 block text-sm font-medium">Nama Topik</span><input bind:value={topicName} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showTopic = false)}>Batal</Button>
        <Button onclick={saveTopic} disabled={savingTopic}>{#if savingTopic}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}
