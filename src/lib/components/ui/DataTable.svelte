<script lang="ts">
  import { cn } from '$lib/utils';
  import Card from '$components/ui/Card.svelte';
  import { ChevronUp, ChevronDown, Search } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  export interface DataColumn {
    key: string;
    label: string;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
    className?: string;
  }

  let {
    rows = [] as any[],
    columns = [] as DataColumn[],
    searchKeys = [] as string[],
    searchPlaceholder = 'Cari…',
    pageSize = 10,
    empty = 'Tidak ada data',
    cell
  }: {
    rows: any[];
    columns: DataColumn[];
    searchKeys?: string[];
    searchPlaceholder?: string;
    pageSize?: number;
    empty?: string;
    cell?: Snippet<[{ row: any; col: DataColumn }]>;
  } = $props();

  let q = $state('');
  let sortKey = $state('');
  let sortDir = $state<'asc' | 'desc'>('asc');
  let page = $state(1);

  const sortableKeys = $derived(columns.filter((c) => c.sortable).map((c) => c.key));
  const activeSearchKeys = $derived(
    searchKeys.length ? searchKeys : columns.filter((c) => c.key).map((c) => c.key)
  );

  const filtered = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      activeSearchKeys.some((k) => String(r?.[k] ?? '').toLowerCase().includes(needle))
    );
  });

  const sorted = $derived.by(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    const toNum = (v: unknown): number => {
      if (typeof v === 'number') return v;
      const s = String(v ?? '').trim();
      // Number("") === 0, bukan NaN → harus dicek manual agar teks
      // (nama/username/agama) tidak semuanya jatuh ke 0 (sort tidak berfungsi).
      if (s === '') return NaN;
      return Number(s);
    };
    arr.sort((a, b) => {
      const va = a?.[sortKey];
      const vb = b?.[sortKey];
      const na = toNum(va);
      const nb = toNum(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na;
      }
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base'
      });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
  const paged = $derived(sorted.slice((page - 1) * pageSize, page * pageSize));
  const rangeStart = $derived(sorted.length === 0 ? 0 : (page - 1) * pageSize + 1);
  const rangeEnd = $derived(Math.min(page * pageSize, sorted.length));

  $effect(() => {
    if (page > totalPages) page = totalPages;
  });

  function setSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
    page = 1;
  }

  function setQ(v: string) {
    q = v;
    page = 1;
  }

  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums: (number | '…')[] = [1];
    if (page > 3) nums.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
    if (page < totalPages - 2) nums.push('…');
    nums.push(totalPages);
    return nums;
  }
</script>

<div class="space-y-3">
  {#if activeSearchKeys.length > 0}
    <div class="relative">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        bind:value={q}
        oninput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
        type="search"
        placeholder={searchPlaceholder}
        class="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-72"
      />
    </div>
  {/if}

  <Card class="overflow-hidden p-0">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px] text-sm">
        <thead class="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {#each columns as col (col.key)}
              <th class={cn('px-4 py-3', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '', col.className)}>
                {#if col.sortable}
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                    onclick={() => setSort(col.key)}
                  >
                    {col.label}
                    {#if sortKey === col.key}
                      {#if sortDir === 'asc'}<ChevronUp class="h-3.5 w-3.5" />{:else}<ChevronDown class="h-3.5 w-3.5" />{/if}
                    {:else}
                      <ChevronUp class="h-3.5 w-3.5 opacity-0" />
                    {/if}
                  </button>
                {:else}
                  {col.label}
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if paged.length === 0}
            <tr>
              <td colspan={columns.length} class="px-4 py-10 text-center text-muted-foreground">{empty}</td>
            </tr>
          {:else}
            {#each paged as row (JSON.stringify(row) ?? Math.random())}
              <tr class="border-t border-border">
                {#each columns as col (col.key)}
                  <td class={cn('px-4 py-3', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '', col.className)}>
                    {#if cell}
                      {@render cell({ row, col })}
                    {:else}
                      {String(row?.[col.key] ?? '—')}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>

  {#if totalPages > 1 || sorted.length > 0}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs text-muted-foreground">
        Menampilkan <span class="font-semibold text-foreground">{rangeStart}–{rangeEnd}</span> dari <span class="font-semibold text-foreground">{sorted.length}</span> data
      </p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onclick={() => (page = Math.max(1, page - 1))}
          class="h-8 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >Sebelumnya</button>
        {#each pageNumbers() as p, i (i)}
          {#if p === '…'}
            <span class="px-1 text-muted-foreground">…</span>
          {:else}
            <button
              type="button"
              onclick={() => (page = p)}
              class={cn('h-8 w-8 rounded-lg border text-sm', p === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent')}
            >{p}</button>
          {/if}
        {/each}
        <button
          type="button"
          disabled={page === totalPages}
          onclick={() => (page = Math.min(totalPages, page + 1))}
          class="h-8 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >Berikutnya</button>
      </div>
    </div>
  {/if}
</div>