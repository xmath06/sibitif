<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { user } from '$lib/stores/session';
  import { Loader2, Plus, Pencil, Trash2, X, ArrowLeft, ListTree } from 'lucide-svelte';

  const subjectId = $page.params.id;

  interface Subject { id: string; code: string; name: string }
  interface TopicItem {
    id: string;
    name: string;
    subjectId: string;
    createdByUserId: string;
    createdByUser: { id: string; name: string } | null;
    ownQuestionCount: number;
    sharedQuestionCount: number;
    isOwnedByMe: boolean;
  }

  let subject = $state<Subject | null>(null);
  let topics = $state<TopicItem[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showModal = $state(false);
  let editingTopic = $state<TopicItem | null>(null);
  let topicName = $state('');
  let savingTopic = $state(false);
  let topicErr = $state('');

  async function load() {
    loading = true; error = '';
    try {
      const [subjRes, topicRes] = await Promise.all([
        api.get<Subject>(`/subjects/${subjectId}`),
        api.get<TopicItem[]>(`/topics?subjectId=${subjectId}`)
      ]);
      subject = (Array.isArray(subjRes) ? subjRes : ((subjRes as any).data ?? subjRes)) as Subject;
      topics = (Array.isArray(topicRes) ? topicRes : ((topicRes as any).data ?? [])) as TopicItem[];
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }

  function openCreate() {
    editingTopic = null;
    topicName = ''; topicErr = ''; showModal = true;
  }
  function openEdit(t: TopicItem) {
    editingTopic = t;
    topicName = t.name; topicErr = ''; showModal = true;
  }
  async function saveTopic() {
    savingTopic = true; topicErr = '';
    try {
      if (editingTopic) await api.put(`/topics/${editingTopic.id}`, { name: topicName });
      else await api.post('/topics', { subjectId, name: topicName });
      showModal = false; await load();
    } catch (e) { topicErr = e instanceof ApiError ? e.message : 'Gagal menyimpan'; }
    finally { savingTopic = false; }
  }
  async function delTopic(t: TopicItem) {
    if (!confirm(`Hapus topik "${t.name}"?`)) return;
    await api.del(`/topics/${t.id}`); await load();
  }

  function isMine(t: TopicItem) {
    return t.isOwnedByMe || t.createdByUserId === $user?.id;
  }

  onMount(load);
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <a href="/teacher/subjects" class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft class="h-4 w-4" /> Kembali ke Mata Pelajaran</a>
    <h1 class="text-xl font-bold text-foreground">
      Topik / Bab{#if subject}<span class="text-muted-foreground"> — {subject.code} {subject.name}</span>{/if}
    </h1>
    <p class="text-sm text-muted-foreground">Kelola bab & soal per topik.</p>
  </div>
  <Button onclick={openCreate}><Plus class="h-4 w-4" /> Tambah Bab/Topik Baru</Button>
</div>

{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if topics.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada topik. Tambah bab/topik baru untuk mulai menyusun soal.</Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each topics as t (t.id)}
      <Card class="flex flex-col p-5">
        <div class="mb-1 flex items-start justify-between gap-2">
          <div>
            <h3 class="font-semibold text-foreground">{t.name}</h3>
            {#if isMine(t)}
              <Badge tone="primary" class="mt-1">Milik Saya</Badge>
            {:else if t.createdByUser}
              <Badge tone="default" class="mt-1">Guru: {t.createdByUser.name}</Badge>
            {:else}
              <Badge tone="default" class="mt-1">Guru lain</Badge>
            {/if}
          </div>
          <div class="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onclick={() => openEdit(t)} title="Edit"><Pencil class="h-4 w-4" /></Button>
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

{#if showModal}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onclick={(e) => e.target === e.currentTarget && (showModal = false)} onkeydown={(e) => e.key === 'Escape' && (showModal = false)}>
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editingTopic ? 'Edit' : 'Tambah'} Bab/Topik</h3>
        <button onclick={() => (showModal = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if topicErr}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{topicErr}</p>{/if}
      <label class="block"><span class="mb-1 block text-sm font-medium">Nama Topik</span><input bind:value={topicName} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showModal = false)}>Batal</Button>
        <Button onclick={saveTopic} disabled={savingTopic}>{#if savingTopic}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}
