<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { SafeUser, Role, Religion } from '$api/types';
  import Card from '$components/ui/Card.svelte';
  import Button from '$components/ui/Button.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import DataTable from '$components/ui/DataTable.svelte';
  import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import ExcelImportButton from '$components/ExcelImportButton.svelte';
  import { importUsers } from '$lib/imports';

  const ROLES: Role[] = ['ADMIN', 'TEACHER', 'STUDENT'];
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

  let users = $state<SafeUser[]>([]);
  let classes = $state<{ id: string; name: string }[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showModal = $state(false);
  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let formError = $state('');
  let f = $state({ name: '', username: '', password: '', role: 'STUDENT' as Role, religion: '' as Religion | '' });

  const roleTone = (r: Role) =>
    r === 'ADMIN' ? 'primary' : r === 'TEACHER' ? 'default' : 'muted';

  async function load() {
    loading = true;
    error = '';
    try {
      const [ur, cr] = await Promise.all([
        api.get<{ data: SafeUser[]; pagination: unknown }>('/users', { limit: 10000 }),
        api.get('/classes')
      ]);
      users = ((ur as any).data ?? []) as SafeUser[];
      classes = ((cr as any).data ?? cr ?? []) as any[];
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal memuat user';
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    editingId = null;
    f = { name: '', username: '', password: '', role: 'STUDENT', religion: '' };
    formError = '';
    showModal = true;
  }

  function openEdit(u: SafeUser) {
    editingId = u.id;
    f = {
      name: u.name,
      username: u.username,
      password: '',
      role: u.role,
      religion: (u.religion ?? '') as Religion | ''
    };
    formError = '';
    showModal = true;
  }

  async function submit() {
    saving = true;
    formError = '';
    const payload: Record<string, unknown> = {
      name: f.name,
      username: f.username,
      role: f.role,
      religion: f.religion || null
    };
    if (f.password) payload.password = f.password;

    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      showModal = false;
      await load();
    } catch (e) {
      formError = e instanceof ApiError ? e.message : 'Gagal menyimpan';
    } finally {
      saving = false;
    }
  }

  async function remove(u: SafeUser) {
    if (!confirm(`Hapus user "${u.name}" (${u.username})?`)) return;
    try {
      await api.del(`/users/${u.id}`);
      await load();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Gagal menghapus';
    }
  }

  async function onImportUsers(rows: any[]) {
    const r = await importUsers(rows, classes as any);
    await load();
    return r;
  }

  onMount(load);
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 class="text-xl font-bold text-foreground">Manajemen User</h1>
    <p class="text-sm text-muted-foreground">Kelola akun admin, guru, & siswa.</p>
  </div>
  <Button onclick={openCreate}><Plus class="h-4 w-4" /> Tambah User</Button>
</div>

<div class="mb-4 flex flex-wrap items-center gap-3">
  <ExcelImportButton label="Import User (Excel)" templateName="template_user.xlsx"
    templateHeaders={['nama','username','password','role','agama','kelas']}
    templateSample={{ nama: 'Budi Santoso', username: 'budi01', password: 'pass123', role: 'STUDENT', agama: 'ISLAM', kelas: '' }}
    onImport={onImportUsers} />
  <span class="text-xs text-muted-foreground">Kolom: nama, username, password, role (ADMIN/TEACHER/STUDENT), agama (opsional), kelas (opsional, harus cocok dengan data Kelas).</span>
</div>

{#if error}
  <p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if users.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada user.</Card>
{:else}
  <DataTable
    rows={users}
    searchKeys={['name', 'username', 'role', 'religion']}
    searchPlaceholder="Cari nama, username, role, atau agama…"
    columns={[
      { key: 'name', label: 'Nama', sortable: true },
      { key: 'username', label: 'Username', sortable: true },
      { key: 'role', label: 'Role', sortable: true },
      { key: 'religion', label: 'Agama', sortable: true },
      { key: 'actions', label: 'Aksi', align: 'right' }
    ]}
  >
    {#snippet cell({ row, col })}
      {#if col.key === 'name'}
        <span class="font-medium text-foreground">{row.name}</span>
      {:else if col.key === 'username'}
        <span class="text-muted-foreground">{row.username}</span>
      {:else if col.key === 'role'}
        <Badge tone={roleTone(row.role)}>{row.role}</Badge>
      {:else if col.key === 'religion'}
        <span class="text-muted-foreground">{row.religion ?? '-'}</span>
      {:else if col.key === 'actions'}
        <div class="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onclick={() => openEdit(row)} title="Edit">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onclick={() => remove(row)} title="Hapus">
            <Trash2 class="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      {/if}
    {/snippet}
  </DataTable>
{/if}

{#if showModal}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && (showModal = false)}
    onkeydown={(e) => e.key === 'Escape' && (showModal = false)}
  >
    <Card class="w-full max-w-md p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">{editingId ? 'Edit User' : 'Tambah User'}</h3>
        <button onclick={() => (showModal = false)} class="text-muted-foreground hover:text-foreground">
          <X class="h-5 w-5" />
        </button>
      </div>

      {#if formError}
        <p class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
      {/if}

      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Nama</span>
          <input bind:value={f.name} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Username</span>
          <input bind:value={f.username} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Password {editingId ? '(kosongkan jika tidak diubah)' : ''}</span>
          <input type="password" bind:value={f.password} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Role</span>
            <select bind:value={f.role} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              {#each ROLES as r}<option value={r}>{r}</option>{/each}
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Agama</span>
            <select bind:value={f.religion} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              {#each RELIGIONS as r}<option value={r}>{r === '' ? '—' : r}</option>{/each}
            </select>
          </label>
        </div>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={() => (showModal = false)}>Batal</Button>
        <Button onclick={submit} disabled={saving}>
          {#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan
        </Button>
      </div>
    </Card>
  </div>
{/if}
