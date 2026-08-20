<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { ScheduleStatus, TargetType } from '$api/types';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, Plus, Trash2, MonitorPlay, GraduationCap, FileCheck2, Pencil } from 'lucide-svelte';
  import { user } from '$lib/stores/session';
  import ExcelImportButton from '$components/ExcelImportButton.svelte';
  import { importSchedules } from '$lib/imports';
  import { formatClock } from '$lib/utils';

  interface Sched { id: string; title: string; scheduleStatus: ScheduleStatus; category?: string | null; accessCode?: string | null; showResultImmediately?: boolean; targetType?: TargetType; package?: { title?: string }; startTime?: string | null; endTime?: string | null; allocations?: { id: string }[] }

  let schedules = $state<Sched[]>([]);
  let packages = $state<any[]>([]);
  let loading = $state(true);
  let error = $state('');

  async function load() {
    loading = true; error = '';
    try {
      const [sr, pr] = await Promise.all([
        api.get<{ data: Sched[] }>('/schedules', { limit: 10000 }),
        api.get<{ data: any[] }>('/packages', { limit: 10000 })
      ]);
      schedules = ((sr as any).data ?? []) as Sched[];
      packages = ((pr as any).data ?? []) as any[];
    } catch (e) { error = e instanceof ApiError ? e.message : 'Gagal memuat'; }
    finally { loading = false; }
  }
  async function onImportSchedules(rows: any[]) {
    const r = await importSchedules(rows, packages);
    await load();
    return r;
  }

  function statusTone(s: ScheduleStatus) {
    return s === 'ON_GOING' ? 'success' : s === 'PAUSED' ? 'warning' : s === 'ENDED' ? 'muted' : 'default';
  }

  // Admin: boleh edit kapan saja. Guru: hanya sebelum jadwal mulai (SCHEDULED & startTime belum lewat).
  function canEdit(s: Sched) {
    if ($user?.role === 'ADMIN') return true;
    if ($user?.role === 'TEACHER') {
      return s.scheduleStatus === 'SCHEDULED' && new Date(s.startTime ?? '').getTime() > Date.now();
    }
    return false;
  }

  async function del(s: Sched) {
    if (!confirm(`Hapus jadwal "${s.title}"?`)) return;
    await api.del(`/schedules/${s.id}`); await load();
  }

  onMount(load);
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl font-bold text-foreground">Jadwal Ujian</h1>
  <Button onclick={() => (location.href = '/teacher/schedules/new')}><Plus class="h-4 w-4" /> Buat Jadwal</Button>
</div>
<div class="mb-4 flex flex-wrap items-center gap-3">
  <ExcelImportButton label="Import Jadwal (Excel)" templateName="template_jadwal.xlsx"
    templateHeaders={['paket','judul','mulai','kategori','kode_akses','tampil_hasil','target','agama']}
    templateSample={{ paket: 'UTS Ganjil', judul: 'UTS Matematika', mulai: '2026-08-20 08:00', kategori: 'EXAM', kode_akses: '', tampil_hasil: 'Y', target: 'ALL_STUDENTS', agama: '' }}
    onImport={onImportSchedules} />
  <span class="text-xs text-muted-foreground">Kolom: paket (judul), judul, mulai (YYYY-MM-DD HH:MM), kategori (EXAM/ASSIGNMENT), kode_akses, tampil_hasil (Y/N), target, agama.</span>
</div>
{#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

{#if loading}
  <div class="grid place-items-center py-20 text-muted-foreground"><Loader2 class="h-6 w-6 animate-spin" /></div>
{:else if schedules.length === 0}
  <Card class="p-8 text-center text-muted-foreground">Belum ada jadwal ujian.</Card>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each schedules as s (s.id)}
      <Card class="flex flex-col p-5">
<div class="mb-2 flex items-start justify-between gap-2">
            <h3 class="font-semibold text-foreground">{s.title}</h3>
            <div class="flex items-center gap-1.5">
              {#if s.category}<Badge>{s.category}</Badge>{/if}
              <Badge tone={statusTone(s.scheduleStatus)}>{s.scheduleStatus}</Badge>
            </div>
          </div>
        {#if s.package?.title}<p class="text-sm text-muted-foreground">{s.package.title}</p>{/if}
        <p class="mt-1 text-xs text-muted-foreground">Mulai: {formatClock(s.startTime)}</p>
        <p class="text-xs text-muted-foreground">Teralokasi: <span class="font-semibold text-foreground">{s.allocations?.length ?? 0}</span> siswa</p>
        {#if s.accessCode}<p class="text-xs text-muted-foreground">Kode akses: <span class="font-mono">{s.accessCode}</span></p>{/if}

        <div class="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onclick={() => (location.href = `/schedules/${s.id}/projector`)}><MonitorPlay class="h-4 w-4" /> Proyektor</Button>
          <Button variant="outline" size="sm" onclick={() => (location.href = `/teacher/monitor/${s.id}`)}><GraduationCap class="h-4 w-4" /> Monitor</Button>
          <Button variant="outline" size="sm" onclick={() => (location.href = `/teacher/grading/${s.id}`)}><FileCheck2 class="h-4 w-4" /> Koreksi</Button>
          <Button variant="ghost" size="sm" onclick={() => del(s)}><Trash2 class="h-4 w-4 text-rose-600" /></Button>
          {#if canEdit(s)}<Button variant="outline" size="sm" onclick={() => (location.href = `/teacher/schedules/${s.id}/edit`)}><Pencil class="h-4 w-4" /> Edit</Button>{/if}
        </div>
      </Card>
    {/each}
  </div>
{/if}
