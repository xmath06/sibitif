<script lang="ts">
  import { Download, Upload, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-svelte';
  import Button from '$components/ui/Button.svelte';
  import { readExcelFile, downloadExcelTemplate } from '$lib/excel';
  import type { ExcelRow } from '$lib/excel';
  import type { ImportResult } from '$lib/imports';

  let {
    label = 'Import Excel',
    templateName = 'template.xlsx',
    templateHeaders = [] as string[],
    templateSample = {} as ExcelRow,
    ownerMode = false,
    teachers = [] as { id: string; name: string }[],
    onImport = async (_rows: ExcelRow[], _owner?: string | null): Promise<ImportResult> => ({ ok: 0, failed: 0, errors: [] })
  }: {
    label?: string;
    templateName?: string;
    templateHeaders?: string[];
    templateSample?: ExcelRow;
    ownerMode?: boolean;
    teachers?: { id: string; name: string }[];
    onImport?: (rows: ExcelRow[], owner?: string | null) => Promise<ImportResult>;
  } = $props();

  let busy = $state(false);
  let result = $state<ImportResult | null>(null);
  let detailOpen = $state(true);
  let fileInput: HTMLInputElement;

  let showOwner = $state(false);
  let ownerChoice = $state<'admin' | 'teacher'>('admin');
  let ownerTeacherId = $state<string>('');
  let pendingOwner = $state<string | null | undefined>(undefined);

  function openPicker() {
    if (ownerMode) {
      ownerChoice = 'admin';
      ownerTeacherId = teachers[0]?.id ?? '';
      showOwner = true;
    } else {
      fileInput?.click();
    }
  }

  function confirmOwner() {
    pendingOwner = ownerChoice === 'teacher' ? ownerTeacherId || null : null;
    showOwner = false;
    fileInput?.click();
  }

  async function handleFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    busy = true;
    result = null;
    detailOpen = true;
    try {
      const rows = await readExcelFile(f);
      result = await onImport(rows, pendingOwner);
    } catch (err: any) {
      result = { ok: 0, failed: 1, errors: [err?.message || 'Gagal membaca file'] };
    } finally {
      busy = false;
      (e.currentTarget as HTMLInputElement).value = '';
    }
  }

  function dlTemplate() {
    if (templateHeaders.length) downloadExcelTemplate(templateHeaders, templateSample, templateName);
  }
</script>

<div class="space-y-2">
  <div class="flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" type="button" disabled={busy} title={label} onclick={openPicker}>
      {#if busy}<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>{:else}<Upload class="h-4 w-4" />{/if}
      {label}
    </Button>
    <input bind:this={fileInput} class="hidden" type="file" accept=".xlsx,.xls,.csv" onchange={handleFile} />
    {#if templateHeaders.length}
      <Button variant="ghost" size="sm" type="button" onclick={dlTemplate} title="Unduh template">
        <Download class="h-4 w-4" /> Template
      </Button>
    {/if}
    {#if result}
      <span class="inline-flex items-center gap-1 text-xs {result.failed ? 'text-rose-600' : 'text-emerald-600'}">
        {#if result.failed}<AlertCircle class="h-3.5 w-3.5" />{:else}<CheckCircle2 class="h-3.5 w-3.5" />{/if}
        {result.ok} berhasil{result.failed ? `, ${result.failed} gagal` : ''}
      </span>
      {#if result.failed}
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onclick={() => (detailOpen = !detailOpen)}
        >
          {#if detailOpen}<ChevronUp class="h-3.5 w-3.5" />{:else}<ChevronDown class="h-3.5 w-3.5" />{/if}
          Rincian
        </button>
      {/if}
    {/if}
  </div>

  {#if result?.failed && detailOpen}
    <div class="max-w-2xl rounded-lg border border-rose-200 bg-rose-50/60 p-3">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">Alasan gagal</p>
      <ul class="space-y-1">
        {#each result.errors as err, i (i)}
          <li class="text-xs text-rose-700">{err}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

{#if showOwner}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick={() => (showOwner = false)} role="presentation">
    <div class="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold">Import sebagai</h3>
        <button type="button" class="text-muted-foreground hover:text-foreground" onclick={() => (showOwner = false)}>
          <X class="h-4 w-4" />
        </button>
      </div>
      <p class="mb-3 text-xs text-muted-foreground">
        Pilih pemilik data hasil impor. Guru yang dipilih akan melihat paket/jadwal/soal ini sebagai miliknya.
      </p>
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" bind:group={ownerChoice} value="admin" />
          <span>Admin (saya)</span>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" bind:group={ownerChoice} value="teacher" />
          <span>Guru tertentu</span>
        </label>
        {#if ownerChoice === 'teacher'}
          <select bind:value={ownerTeacherId} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {#if teachers.length === 0}
              <option value="">— tidak ada guru —</option>
            {/if}
            {#each teachers as t (t.id)}
              <option value={t.id}>{t.name}</option>
            {/each}
          </select>
        {/if}
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" type="button" onclick={() => (showOwner = false)}>Batal</Button>
        <Button size="sm" type="button" disabled={ownerChoice === 'teacher' && !ownerTeacherId} onclick={confirmOwner}>Lanjut</Button>
      </div>
    </div>
  </div>
{/if}
