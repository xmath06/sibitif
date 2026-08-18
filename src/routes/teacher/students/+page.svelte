<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { SafeUser, Religion } from '$api/types';
  import Card from '$components/ui/Card.svelte';
  import Button from '$components/ui/Button.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import { Loader2, Plus, Pencil, Trash2, X, Users } from 'lucide-svelte';
  import ExcelImportButton from '$components/ExcelImportButton.svelte';
  import { importStudents } from '$lib/imports';

  const RELIGIONS: (Religion | '')[] = [
    '',
    'ISLAM',
    'KRISTEN',
    'KATOLIK',
    'HINDU',
    'BUDDHA',
    'KONGHUCU',
    'OTHER'
  ];

  let students = $state<SafeUser[]>([]);
  let classes = $state<{ id: string; name: string; gradeLevel: number }[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showModal = $state(false);
  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let formError = $state('');
  let f = $state({ name: '', username: '', password: '', religion: '' as Religion | '', classId: '' });

  async function load() {
    loading = true;
    error = '';
    try {
      const [sr, cr] = await Promise.all([
        api.get<{ data: SafeUser[] }>('/teacher/students'),
        api.get('/classes')
      ]);
      students = ((sr as any).data ?? []) as SafeUser[];
      classes = ((cr as any).data ?? cr ?? []) as any[];
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal memuat siswa';
    } finally {
      loading = false;
    }
  }

  function className(id?: string) {
    const c = classes.find((x) => x.id === id);
    return c ? `${c.gradeLevel} · ${c.name}` : '—';
  }

  function openCreate() {
    editingId = null;
    f = { name: '', username: '', password: '', religion: '', classId: '' };
    formError = '';
    showModal = true;
  }
  function openEdit(u: SafeUser) {
    editingId = u.id;
    f = { name: u.name, username: u.username, password: '', religion: (u.religion ?? '') as Religion | '', classId: (u as any).classId ?? '' };
    formError = '';
    showModal = true;
  }
  async function submit() {
    saving = true;
    formError = '';
    const payload: Record<string, unknown> = { name: f.name, username: f.username, religion: f.religion || null, classId: f.classId || null };
    if (f.password) payload.password = f.password;
    try {
      if (editingId) await api.put(`/teacher/students/${editingId}`, payload);
      else await api.post('/teacher/students', payload);
      showModal = false;
      await load();
    } catch (e) {
      formError = e instanceof ApiError ? e.message : 'Gagal menyimpan';
    } finally {
      saving = false;
    }
  }
  async function remove(u: SafeUser) {
    if (!confirm(`Hapus siswa "${u.name}" (${u.username})?`)) return;
    try {
      await api.del(`/teacher/students/${u.id}`);
      await load();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal menghapus';
    }
  }
  async function onImport(rows: any[]) {
    const r = await importStudents(rows, classes as any);
    await load();
    return r;
  }

  onMount(load);
</script>

<div class="mb-5 flex items-center justify-between">
  <div>
    <h1 class="text-xl font-bold text-foreground">Manajemen Siswa</h1>
    <p class="text-sm text-muted-foreground">Kelola akun siswa (terpisah dari manajemen admin & guru).</p>
  </div>
  <Button onclick={openCreate}><Plus class="h-4 w-4" /> Tambah Siswa</Button>
</div>

<div class="mb-4 flex flex-wrap items-center gap-3">
  <ExcelImportButton label="Import Siswa (Excel)" templateName="template_siswa.xlsx"
    templateHeaders={['nama','username','password','agama','kelas']}
    templateSample={{ nama: 'Budi Santoso', username: 'budi01', password: 'siswa123', agama: 'ISLAM', kelas: '' }}
    onImport={onImport} />
  <span class="text-xs text-muted-foreground">Kolom: nama, username, password, agama (opsional), kelas (diabaikan).</span>
</div>

{#if error}
  <p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if students.length === 0}
  <Card class="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
    <Users class="h-8 w-8" /> Belum ada siswa.
  </Card>
{:else}
  <Card class="overflow-hidden p-0">
    <table class="w-full text-sm">
      <thead class="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th class="px-4 py-3">Nama</th>
          <th class="px-4 py-3">Username</th>
          <th class="px-4 py-3">Jenjang / Kelas</th>
          <th class="px-4 py-3">Agama</th>
          <th class="px-4 py-3 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each students as u (u.id)}
          <tr class="border-t border-border">
            <td class="px-4 py-3 font-medium text-foreground">{u.name}</td>
            <td class="px-4 py-3 text-muted-foreground">{u.username}</td>
            <td class="px-4 py-3 text-muted-foreground">{className((u as any).classId)}</td>
            <td class="px-4 py-3 text-muted-foreground">{u.religion ?? '-'}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onclick={() => openEdit(u)} title="Edit"><Pencil class="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onclick={() => remove(u)} title="Hapus"><Trash2 class="h-4 w-4 text-rose-600" /></Button>
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
        <h3 class="text-base font-semibold text-foreground">{editingId ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
        <button onclick={() => (showModal = false)} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      {#if formError}<p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>{/if}
      <div class="space-y-3">
        <label class="block"><span class="mb-1 block text-sm font-medium">Nama</span>
          <input bind:value={f.name} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Username</span>
          <input bind:value={f.username} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Password {editingId ? '(kosongkan jika tidak diubah)' : ''}</span>
          <input type="password" bind:value={f.password} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Agama</span>
          <select bind:value={f.religion} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {#each RELIGIONS as r}<option value={r}>{r === '' ? '—' : r}</option>{/each}
          </select></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Kelas</span>
          <select bind:value={f.classId} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">—</option>
            {#each classes as c}<option value={c.id}>{c.gradeLevel} · {c.name}</option>{/each}
          </select></label>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showModal = false)}>Batal</Button>
        <Button onclick={submit} disabled={saving}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
      </div>
    </Card>
  </div>
{/if}
