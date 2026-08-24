<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$api/client';
  import { user } from '$lib/stores/session';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Plus, Pencil, Trash2, X, ListTree, BookOpen } from 'lucide-svelte';

  interface TopicItem {
    id: string;
    name: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    createdByUserId: string;
    createdByUser: { id: string; name: string } | null;
    ownQuestionCount: number;
    sharedQuestionCount: number;
    isOwnedByMe: boolean;
  }
  interface Subject { id: string; code: string; name: string }

  let topics = $state<TopicItem[]>([]);
  let subjects = $state<Subject[]>([]);
  let loading = $state(true);
  let error = $state('');

  // Topic modal
  let showTopic = $state(false);
  let editingTopic = $state<TopicItem | null>(null);
  let topicName = $state('');
  let topicSubjectId = $state('');
  let savingTopic = $state(false);
  let topicErr = $state('');

  // Subject modal (admin only)
  let showSubj = $state(false);
  let editingSubj = $state<Subject | null>(null);
  let subj = $state({ code: '', name: '' });
  let savingSubj = $state(false);
  let subjErr = $state('');

  const isAdmin = $derived($user?.role === 'ADMIN');

  async function load() {
    loading = true; error = '';
    try {
      const [tRes, sRes] = await Promise.all([
        api.get<TopicItem[]>('/topics'),
        api.get<{ data: Subject[] }>('/subjects', { limit: 10000 })
      ]);
      topics = (Array.isArray(tRes) ? tRes : ((tRes as any).data ?? [])) as TopicItem[];
      subjects = ((sRes as any).data ?? []) as Subject[];
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }

  function isMine(t: TopicItem) {
    return t.isOwnedByMe || t.createdByUserId === $user?.id;
  }

  // ===== Topic CRUD =====
  function openCreateTopic() {
    editingTopic = null;
    topicName = '';
    topicSubjectId = subjects[0]?.id ?? '';
    topicErr = ''; showTopic = true;
  }
  function openEditTopic(t: TopicItem) {
    editingTopic = t;
    topicName = t.name;
    topicSubjectId = t.subjectId;
    topicErr = ''; showTopic = true;
  }
  async function saveTopic() {
    if (!topicSubjectId) { topicErr = 'Pilih mata pelajaran terlebih dahulu.'; return; }
    savingTopic = true; topicErr = '';
    try {
      if (editingTopic) await api.put(`/topics/${editingTopic.id}`, { name: topicName });
      else await api.post('/topics', { subjectId: topicSubjectId, name: topicName });
      showTopic = false; await load();
    } catch (e) { topicErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { savingTopic = false; }
  }
  async function delTopic(t: TopicItem) {
    if (!confirm(`Hapus topik "${t.name}"?`)) return;
    await api.del(`/topics/${t.id}`); await load();
  }

  // ===== Subject CRUD (admin only) =====
  function openCreateSubj() {
    editingSubj = null;
    subj = { code: '', name: '' };
    subjErr = ''; showSubj = true;
  }
  function openEditSubj(s: Subject) {
    editingSubj = s;
    subj = { code: s.code, name: s.name };
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

  onMount(load);
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 class="text-xl font-bold text-foreground">Bank Soal</h1>
    <p class="text-sm text-muted-foreground">
      Topik & soal dari mata pelajaran yang Anda ampu. Guru tidak dapat membuat mata pelajaran —
      penetapan mapel diatur oleh admin.
    </p>
  </div>
  <div class="flex flex-wrap gap-2">
    {#if isAdmin}
      <Button variant="outline" onclick={openCreateSubj}><BookOpen class="h-4 w-4" /> Kelola Mata Pelajaran</Button>
    {/if}
    <Button onclick={openCreateTopic} disabled={subjects.length === 0}><Plus class="h-4 w-4" /> Tambah Topik</Button>
  </div>
</div>

{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if topics.length === 0}
  <Card class="p-8 text-center text-muted-foreground">
    {#if subjects.length === 0}
      Belum ada mata pelajaran yang diampu. Admin perlu menetapkan mata pelajaran pada akun Anda.
    {:else}
      Belum ada topik. Klik “Tambah Topik” untuk membuat bab/toplik pada mata pelajaran Anda.
    {/if}
  </Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each topics as t (t.id)}
      <Card class="flex flex-col p-5">
        <div class="mb-1 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="inline-block rounded bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
              {t.subjectCode} · {t.subjectName}
            </span>
            <h3 class="mt-1.5 font-semibold text-foreground">{t.name}</h3>
            {#if isMine(t)}
              <Badge tone="primary" class="mt-1">Milik Saya</Badge>
            {:else if t.createdByUser}
              <Badge tone="default" class="mt-1">Guru: {t.createdByUser.name}</Badge>
            {:else}
              <Badge tone="default" class="mt-1">Guru lain</Badge>
            {/if}
          </div>
          <div class="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onclick={() => openEditTopic(t)} title="Edit"><Pencil class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onclick={() => delTopic(t)} title="Hapus"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
          </div>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          {t.ownQuestionCount} soal milik sendiri · {t.sharedQuestionCount} soal dibagikan
        </p>
        <Button variant="outline" size="sm" class="mt-3" onclick={() => goto(`/teacher/questions?topicId=${t.id}`)}>
          <ListTree class="h-3.5 w-3.5" /> Kelola Soal
        </Button>
      </Card>
    {/each}
  </div>
{/if}

{#if showTopic}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (showTopic = false)} onkeydown={(e) => e.key === 'Escape' && (showTopic = false)}>
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editingTopic ? 'Edit' : 'Tambah'} Topik</h3>
        <button onclick={() => (showTopic = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if topicErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{topicErr}</p>{/if}
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Mata Pelajaran</span>
          <select bind:value={topicSubjectId} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {#each subjects as s (s.id)}<option value={s.id}>{s.code} — {s.name}</option>{/each}
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Nama Topik</span>
          <input bind:value={topicName} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showTopic = false)}>Batal</Button>
        <Button onclick={saveTopic} disabled={savingTopic}>{#if savingTopic}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
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
