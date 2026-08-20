<script lang="ts">
  import { renderFunctionGraph, svgToDataUri, validateExpression } from '$lib/graph';
  import Button from '$components/ui/Button.svelte';
  import { X, RefreshCw } from 'lucide-svelte';

  let {
    open = false,
    onClose = () => {},
    onInsert = (_src: string, _alt: string) => {}
  }: {
    open?: boolean;
    onClose?: () => void;
    onInsert?: (src: string, alt: string) => void;
  } = $props();

  let expr = $state('x^2');
  let xMin = $state(-5);
  let xMax = $state(5);
  let yMin = $state(0);
  let yMax = $state(0);
  let autoY = $state(true);
  let showGrid = $state(true);

  const error = $derived(validateExpression(expr));

  const svg = $derived.by(() => {
    if (!error.ok) return '';
    try {
      return renderFunctionGraph({
        expression: expr,
        xMin,
        xMax,
        yMin: autoY ? null : yMin,
        yMax: autoY ? null : yMax,
        showGrid
      });
    } catch {
      return '';
    }
  });

  const previewSrc = $derived(svg ? svgToDataUri(svg) : '');

  function preset(kind: string) {
    if (kind === 'linear') {
      expr = '2x+1';
      xMin = -5;
      xMax = 5;
    } else if (kind === 'quadratic') {
      expr = 'x^2-4';
      xMin = -5;
      xMax = 5;
    } else if (kind === 'cubic') {
      expr = 'x^3-x';
      xMin = -3;
      xMax = 3;
    } else if (kind === 'sine') {
      expr = 'sin(x)';
      xMin = -6.28;
      xMax = 6.28;
    } else if (kind === 'reciprocal') {
      expr = '1/x';
      xMin = -5;
      xMax = 5;
    } else if (kind === 'sqrt') {
      expr = 'sqrt(x)';
      xMin = 0;
      xMax = 10;
    }
    autoY = true;
  }

  function insert() {
    if (!error.ok || !previewSrc) return;
    onInsert(previewSrc, `Grafik ${expr}`);
    onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
  >
    <div class="w-full max-w-2xl rounded-2xl bg-card p-5 shadow-xl animate-fade-in">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Grafik Fungsi f(x)</h3>
        <button onclick={onClose} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>

      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">f(x) =</span>
          <input
            bind:value={expr}
            placeholder="contoh: x^2-4, sin(x), 2x+1"
            class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {#if !error.ok}
            <span class="mt-1 block text-xs text-rose-600">{error.message}</span>
          {/if}
        </label>

        <div class="flex flex-wrap gap-1">
          {#each [['linear', 'Garis lurus'], ['quadratic', 'Parabola'], ['cubic', 'Kubik'], ['sine', 'Sinus'], ['reciprocal', 'Hiperbola'], ['sqrt', 'Akar']] as [k, label] (k)}
            <Button variant="outline" size="sm" onclick={() => preset(k)}>{label}</Button>
          {/each}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-sm font-medium">x min</span>
            <input type="number" bind:value={xMin} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium">x max</span>
            <input type="number" bind:value={xMax} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" bind:checked={autoY} class="h-4 w-4 rounded border-border accent-primary" />
          Rentang y otomatis
        </label>
        {#if !autoY}
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1 block text-sm font-medium">y min</span>
              <input type="number" bind:value={yMin} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-medium">y max</span>
              <input type="number" bind:value={yMax} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
          </div>
        {/if}

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" bind:checked={showGrid} class="h-4 w-4 rounded border-border accent-primary" />
          Tampilkan garis bantu
        </label>

        <div class="overflow-x-auto rounded-lg border border-border bg-slate-50 p-2">
          {#if previewSrc}
            <img src={previewSrc} alt="Pratinjau grafik" class="mx-auto max-h-72 w-auto" />
          {:else}
            <div class="grid h-40 place-items-center text-sm text-muted-foreground">
              <span class="inline-flex items-center gap-2"><RefreshCw class="h-4 w-4 animate-spin" /> Menunggu ekspresi valid…</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" onclick={onClose}>Batal</Button>
        <Button onclick={insert} disabled={!error.ok}>Sisipkan</Button>
      </div>
    </div>
  </div>
{/if}