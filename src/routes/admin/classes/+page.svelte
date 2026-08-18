<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-svelte';
  import ExcelImportButton from '$components/ExcelImportButton.svelte';
  import { importClasses } from '$lib/imports';

  interface Klas { id: string; gradeLevel: number; name: string }

  let classes = $state<Klas[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showModal = $state(false);
  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let formError = $state('');
  let f = $state({ gradeLevel: 10, name: '' });

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await api.get('/classes');
      classes = ((res as any).data ?? res ?? []) as Klas[];
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal memuat kelas';
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    editingId = null;
    f = { gradeLevel: 10, name: '' };
    formError = '';
    showModal = true;
  }
  function openEdit(c: Klas) {
    editingId = c.id;
    f = { gradeLevel: c.gradeLevel, name: c.name };
    formError = '';
    showModal = true;
  }
  async function submit() {
    saving = true;
    formError = '';
    try {
      if (editingId) await api.put(`/classes/${editingId}`, f);
      else await api.post('/classes', f);
      showModal = false;
      await load();
    } catch (e) {
      formError = e instanceof ApiError ? e.message : 'Gagal menyimpan';
    } finally {
      saving = false;
    }
  }
  async function remove(c: Klas) {
    if (!confirm(`Hapus kelas "${c.gradeLevel} · ${c.name}"?`)) return;
    try {
      await api.del(`/classes/${c.id}`);
      await load();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal menghapus';
    }
  }

  onMount(load);
</script>

<div class="mb-5 flex items-center justify-between">
  <div>
    <h1 class="text-xl font-bold text-foreground">Manajemen Kelas</h1>
    <p class="text-sm text-muted-foreground">Kelola jenjang & kelas/rombel untuk targeting jadwal dan penempatan siswa.</p>
  </div>
  <Button onclick={openCreate}><Plus class="h-4 w-4" /> Tambah Kelas</Button>
</div>

<div class="mb-4 flex flex-wrap items-center gap-3">
  <ExcelImportButton label="Import Kelas (Excel)" templateName="template_kelas.xlsx"
    templateHeaders={['gradeLevel','name']}
    templateSample={{ gradeLevel: 10, name: 'X IPA 1' }}
    onImport={async (rows) => { const r = await importClasses(rows); await load(); return r; }} />
  <span class="text-xs text-muted-foreground">Kolom: gradeLevel (jenjang, angka), name (nama kelas/rombel).</span>
</div>

{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if classes.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada kelas.</Card>
{:else}
  <Card class="overflow-hidden p-0">
    <table class="w-full text-sm">
      <thead class="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th class="px-4 py-3">Jenjang</th>
          <th class="px-4 py-3">Kelas / Rombel</th>
          <th class="px-4 py-3 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each classes as c (c.id)}
          <tr class="border-t border-border">
            <td class="px-4 py-3 font-medium text-foreground">Kelas {c.gradeLevel}</td>
            <td class="px-4 py-3 text-muted-foreground">{c.name}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onclick={() => openEdit(c)} title="Edit"><Pencil class="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onclick={() => remove(c)} title="Hapus"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
{/if}

{#if showModal}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && (showModal = false)} onkeydown={(e) => e.key === 'Escape' && (showModal = false)}>
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editingId ? 'Edit Kelas' : 'Tambah Kelas'}</h3>
        <button onclick={() => (showModal = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if formError}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>{/if}
      <div class="space-y-3">
        <label class="block"><span class="mb-1 block text-sm font-medium">Jenjang (angka)</span>
          <input type="number" min="1" max="12" bind:value={f.gradeLevel} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Nama Kelas / Rombel</span>
          <input bind:value={f.name} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="mis. X IPA 1" /></label>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showModal = false)}>Batal</Button>
        <Button onclick={submit} disabled={saving}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}
