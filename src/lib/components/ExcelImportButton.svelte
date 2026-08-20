<script lang="ts">
  import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-svelte';
  import Button from '$components/ui/Button.svelte';
  import { readExcelFile, downloadExcelTemplate } from '$lib/excel';
  import type { ExcelRow } from '$lib/excel';
  import type { ImportResult } from '$lib/imports';

  let {
    label = 'Import Excel',
    templateName = 'template.xlsx',
    templateHeaders = [] as string[],
    templateSample = {} as ExcelRow,
    onImport = async (_rows: ExcelRow[]): Promise<ImportResult> => ({ ok: 0, failed: 0, errors: [] })
  }: {
    label?: string;
    templateName?: string;
    templateHeaders?: string[];
    templateSample?: ExcelRow;
    onImport?: (rows: ExcelRow[]) => Promise<ImportResult>;
  } = $props();

  let busy = $state(false);
  let result = $state<ImportResult | null>(null);
  let fileInput: HTMLInputElement;

  async function handleFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    busy = true;
    result = null;
    try {
      const rows = await readExcelFile(f);
      result = await onImport(rows);
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

<div class="flex flex-wrap items-center gap-2">
  <Button variant="outline" size="sm" type="button" disabled={busy} title={label} onclick={() => fileInput?.click()}>
    {#if busy}<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{:else}<Upload class="h-4 w-4" />{/if}
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
  {/if}
</div>
