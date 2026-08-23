<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$api/client';
  import type { TargetType, Religion } from '$api/types';
  import Button from '$components/ui/Button.svelte';
  import Card from '$components/ui/Card.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import { Loader2, Check, ChevronDown, ChevronRight } from 'lucide-svelte';
  import { cn } from '$lib/utils';

  let {
    id,
    initial,
    classes: initialClasses = [],
    students: initialStudents = []
  }: {
    id?: string;
    initial?: any;
    classes?: { id: string; name: string; gradeLevel: number }[];
    students?: { id: string; name: string; className?: string }[];
  } = $props();

  // Diisi dari API di onMount (prop hanya default kosong). Pakai $state agar
  // pembaruan hasil fetch mereaktifkan template (targeting kelas & siswa).
  // (Mendestruktur prop lalu meng-assign ulang tidak reaktif di Svelte 5.)
  let classes = $state<{ id: string; name: string; gradeLevel: number }[]>(initialClasses);
  let students = $state<{ id: string; name: string; className?: string }[]>(initialStudents);

  let packages = $state<{ id: string; title: string; subject?: { religion?: string | null } }[]>([]);
  let loading = $state(false);
  let errorMsg = $state('');
  let success = $state(false);

  let packageId = $state('');
  let title = $state('');
  let category = $state('');
  let startTime = $state('');
  let endTime = $state('');
  let accessCode = $state('');
  let showResultImmediately = $state(true);

  let targetType = $state<TargetType>('ALL_STUDENTS');
  let targetReligion = $state<Religion | ''>('');
  let targetClassIds = $state<string[]>([]);
  let targetGradeLevels = $state<number[]>([]);
  let studentIds = $state<string[]>([]);

  // Pencarian & pengelompokan siswa per kelas agar pemilihan SPECIFIC_STUDENTS
  // tetap nyaman meski siswa sangat banyak (tidak perlu ubah backend:
  // studentIds tetap array ID terpilih yang datar).
  let studentSearch = $state('');
  // Pengelompokan per kelas (collapse): tiap kelas bisa dikembangkan sendiri.
  let expanded = $state<Record<string, boolean>>({});
  const studentGroups = $derived.by(() => {
    const q = studentSearch.trim().toLowerCase();
    const filtered = students.filter((s) => !q || (s.name ?? '').toLowerCase().includes(q));
    const map = new Map<string, { id: string; name: string; className?: string }[]>();
    for (const s of filtered) {
      const key = s.className || 'Tanpa Kelas';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .map(([name, list]) => ({ name, students: list }))
      .sort((a, b) =>
        a.name === 'Tanpa Kelas' ? 1 : b.name === 'Tanpa Kelas' ? -1 : a.name.localeCompare(b.name)
      );
  });
  function toggleClass(ids: string[], allSel: boolean) {
    if (allSel) {
      const drop = new Set(ids);
      studentIds = studentIds.filter((id) => !drop.has(id));
    } else {
      studentIds = [...new Set([...studentIds, ...ids])];
    }
  }
  function setAllExpanded(v: boolean) {
    const next: Record<string, boolean> = {};
    for (const g of studentGroups) next[g.name] = v;
    expanded = next;
  }

  const gradeLevels = $derived([...new Set(classes.map((c) => c.gradeLevel))].sort());

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function toIso(local: string): string | undefined {
    if (!local) return undefined;
    // Input datetime-local dianggap waktu WIB (Asia/Jakarta) secara eksplisit.
    return new Date(local + '+07:00').toISOString();
  }

  // ISO (UTC) -> nilai input datetime-local dalam WIB (Asia/Jakarta)
  function toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const s = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    // en-CA menghasilkan "YYYY-MM-DD, HH:mm"
    return s.replace(', ', 'T');
  }

  function prefill(s: any) {
    if (!s) return;
    packageId = s.packageId ?? '';
    title = s.title ?? '';
    category = s.category ?? '';
    startTime = toLocalInput(s.startTime);
    endTime = toLocalInput(s.endTime);
    accessCode = s.accessCode ?? '';
    showResultImmediately = s.showResultImmediately ?? true;
    targetType = (s.targetType ?? 'ALL_STUDENTS') as TargetType;
    targetReligion = (s.targetReligion ?? '') as Religion | '';
    const targets = s.targets ?? [];
    targetClassIds = targets.map((t: any) => t.targetClassId).filter(Boolean);
    targetGradeLevels = targets.map((t: any) => t.targetGradeLevel).filter((v: any) => v != null);
    studentIds = targets.map((t: any) => t.targetStudentId).filter(Boolean);
  }

  onMount(async () => {
    try {
      const [pres, cres, sres] = await Promise.all([
        api.get('/packages', { limit: 10000 }),
        api.get('/classes'),
        api.get('/teacher/students', { limit: 10000 }),
      ]);
      packages = ((pres as any).data ?? []).map((p: any) => ({ id: p.id, title: p.title, subject: p.subject }));
      const clsList = (((cres as any).data ?? cres) ?? []) as { id: string; name: string; gradeLevel: number }[];
      classes = clsList;
      const classMap = new Map(clsList.map((c) => [c.id, c.name]));
      const stuRaw = (((sres as any).data ?? sres) ?? []) as { id: string; name: string; classId?: string | null }[];
      students = stuRaw.map((u) => ({
        id: u.id,
        name: u.name,
        className: u.classId ? classMap.get(u.classId) ?? undefined : undefined
      }));
    } catch (e) {
      errorMsg = e instanceof ApiError ? e.message : 'Gagal memuat paket';
    }
    if (initial) prefill(initial);
  });

  // Untuk mapel agama, target agama otomatis terisi dari data agama siswa.
  function onPackageChange() {
    const p = packages.find((x) => x.id === packageId);
    if (p?.subject?.religion) targetReligion = p.subject.religion as Religion;
  }

  async function submit() {
    loading = true;
    errorMsg = '';
    success = false;
    const payload = {
      packageId,
      title,
      category: category || undefined,
      startTime: toIso(startTime)!,
      endTime: toIso(endTime),
      accessCode: accessCode || undefined,
      showResultImmediately,
      targetType,
      targetReligion: targetReligion || undefined,
      targetClassIds: targetType === 'BY_CLASS' ? targetClassIds : undefined,
      targetGradeLevels: targetType === 'BY_GRADE' ? targetGradeLevels : undefined,
      studentIds: targetType === 'SPECIFIC_STUDENTS' ? studentIds : undefined
    };
    try {
      if (id) {
        await api.put(`/schedules/${id}`, payload);
        location.href = '/teacher/schedules';
        return;
      }
      await api.post('/schedules', payload);
      success = true;
    } catch (e) {
      errorMsg = e instanceof ApiError ? e.message : 'Gagal menyimpan jadwal';
    } finally {
      loading = false;
    }
  }

  const targets: { value: TargetType; label: string; hint: string }[] = [
    { value: 'ALL_STUDENTS', label: 'Semua Siswa', hint: 'Seluruh siswa sekolah' },
    { value: 'BY_CLASS', label: 'Berdasarkan Kelas/Rombel', hint: 'Pilih satu/multi kelas' },
    { value: 'BY_GRADE', label: 'Berdasarkan Jenjang', hint: 'Mis. Kelas 10 / XI' },
    { value: 'SPECIFIC_STUDENTS', label: 'Siswa Tertentu', hint: 'Remedial / Susulan' }
  ];

  const religions: (Religion | '')[] = ['', 'ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'OTHER'];

  const categoryOptions = [
    { value: 'EXAM', label: 'Ujian (EXAM)' },
    { value: 'ASSIGNMENT', label: 'Tugas (ASSIGNMENT)' },
    { value: 'QUIZ', label: 'Kuis (QUIZ)' },
    { value: 'PRACTICE', label: 'Latihan (PRACTICE)' }
  ];

  // Kategori lama yang tidak ada di daftar (mis. data legacy) tetap ditampilkan
  // sebagai opsi agar edit jadwal tidak kehilangan nilainya.
  const allCategoryOptions = $derived(
    category && !categoryOptions.some((c) => c.value === category)
      ? [{ value: category, label: category }, ...categoryOptions]
      : categoryOptions
  );
</script>

<Card class="mx-auto max-w-3xl p-6">
  <h2 class="mb-1 text-lg font-semibold text-foreground">{id ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian'}</h2>
  <p class="mb-5 text-sm text-muted-foreground">Tentukan paket, waktu, dan sasaran peserta ujian.</p>

  {#if errorMsg}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMsg}</p>{/if}
  {#if success}<p class="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><Check class="h-4 w-4" /> Jadwal tersimpan.</p>{/if}

  <div class="space-y-5">
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Paket Soal</span>
        <select bind:value={packageId} onchange={onPackageChange} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="" disabled>Pilih paket…</option>
          {#each packages as p}<option value={p.id}>{p.title}{p.subject?.religion ? ` (${p.subject.religion})` : ''}</option>{/each}
        </select>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Judul Ujian</span>
        <input bind:value={title} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Ulangan Harian Matematika" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Waktu Mulai</span>
        <input type="datetime-local" bind:value={startTime} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Waktu Selesai (opsional)</span>
        <input type="datetime-local" bind:value={endTime} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Kategori</span>
        <select bind:value={category} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="" disabled>Pilih kategori…</option>
          {#each allCategoryOptions as c}<option value={c.value}>{c.label}</option>{/each}
        </select>
        <p class="mt-1 text-xs text-muted-foreground">Ujian, Tugas, Kuis, atau Latihan</p>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Kode Akses (opsional)</span>
        <input bind:value={accessCode} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Token siswa" />
      </label>
    </div>

    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={showResultImmediately} class="accent-[hsl(var(--primary))]" />
      Tampilkan hasil otomatis setelah submit
    </label>

    <div>
      <span class="mb-2 block text-sm font-medium">Sasaran Peserta</span>
      <div class="grid gap-2 sm:grid-cols-2">
        {#each targets as t}
          <button
            type="button"
            onclick={() => (targetType = t.value)}
            class={cn('rounded-xl border p-3 text-left transition-colors', targetType === t.value ? 'border-primary bg-indigo-50/60' : 'border-border bg-card hover:bg-accent')}
          >
            <span class="block text-sm font-semibold">{t.label}</span>
            <span class="block text-xs text-muted-foreground">{t.hint}</span>
          </button>
        {/each}
      </div>
    </div>

    {#if targetType === 'BY_CLASS'}
      <div class="rounded-xl border border-border p-3">
        <p class="mb-2 text-sm font-medium">Pilih Kelas/Rombel</p>
        <div class="flex flex-wrap gap-2">
          {#each classes as c}
            <button type="button" onclick={() => (targetClassIds = toggle(targetClassIds, c.id))} class={cn('rounded-full border px-3 py-1 text-sm', targetClassIds.includes(c.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>{c.gradeLevel} · {c.name}</button>
          {/each}
        </div>
      </div>
    {/if}

    {#if targetType === 'BY_GRADE'}
      <div class="rounded-xl border border-border p-3">
        <p class="mb-2 text-sm font-medium">Pilih Jenjang/Angkatan</p>
        <div class="flex flex-wrap gap-2">
          {#each gradeLevels as g}
            <button type="button" onclick={() => (targetGradeLevels = toggle(targetGradeLevels, g))} class={cn('rounded-full border px-3 py-1 text-sm', targetGradeLevels.includes(g) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>Kelas {g}</button>
          {/each}
        </div>
      </div>
    {/if}

    {#if targetType === 'SPECIFIC_STUDENTS'}
      <div class="rounded-xl border border-border p-3">
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-sm font-medium">Pilih Siswa (Remedial/Susulan)</p>
          {#if studentGroups.length > 0}
            <div class="flex items-center gap-2 text-xs">
              <button type="button" class="text-primary hover:underline" onclick={() => setAllExpanded(true)}>Buka semua</button>
              <span class="text-muted-foreground">·</span>
              <button type="button" class="text-primary hover:underline" onclick={() => setAllExpanded(false)}>Tutup semua</button>
            </div>
          {/if}
        </div>
        <input
          bind:value={studentSearch}
          placeholder="Cari nama siswa…"
          class="mb-3 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
          {#if studentGroups.length === 0}
            <p class="text-sm text-muted-foreground">{students.length === 0 ? 'Tidak ada data siswa.' : 'Tidak ada siswa cocok pencarian.'}</p>
          {/if}
          {#each studentGroups as grp}
            {@const grpIds = grp.students.map((s) => s.id)}
            {@const allSel = grpIds.length > 0 && grpIds.every((id) => studentIds.includes(id))}
            {@const isOpen = expanded[grp.name] ?? false}
            <div class="rounded-lg border border-border">
              <div class="flex items-center justify-between gap-2 px-2 py-1.5">
                <button type="button" onclick={() => (expanded[grp.name] = !isOpen)} class="inline-flex items-center gap-1.5 text-sm font-medium">
                  {#if isOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                  {grp.name} <span class="opacity-60">({grp.students.length})</span>
                </button>
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    onclick={() => toggleClass(grpIds, allSel)}
                    class={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', allSel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}
                  >
                    {#if allSel}<Check class="h-3.5 w-3.5" />{/if} Pilih semua
                  </button>
                  <span class="text-xs text-muted-foreground">{grp.students.filter((s) => studentIds.includes(s.id)).length} dipilih</span>
                </div>
              </div>
              {#if isOpen}
                <div class="flex flex-wrap gap-2 px-2 pb-2 pl-7">
                  {#each grp.students as s}
                    <button type="button" onclick={() => (studentIds = toggle(studentIds, s.id))} class={cn('rounded-full border px-3 py-1 text-sm', studentIds.includes(s.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>{s.name}</button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div>
      <span class="mb-2 block text-sm font-medium">Filter Agama</span>
      <div class="flex flex-wrap gap-2">
        {#each religions as r}
          <button type="button" onclick={() => (targetReligion = r)} class={cn('rounded-full border px-3 py-1 text-sm', targetReligion === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
            {r === '' ? 'Semua Agama' : r}
          </button>
        {/each}
      </div>
      <p class="mt-1 text-xs text-muted-foreground">Gunakan untuk ujian agama yang berlangsung di jam bersamaan (mis. hanya Islam).</p>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="outline" onclick={() => history.back()}>Batal</Button>
      <Button onclick={submit} disabled={loading}>
        {#if loading}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan Jadwal
      </Button>
    </div>
  </div>
</Card>
