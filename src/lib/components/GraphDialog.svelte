<script lang="ts">
  import { renderFunctionGraph, svgToDataUri, validateExpression } from '$lib/graph';
  import Button from '$components/ui/Button.svelte';
  import { X, Plus, Trash2 } from 'lucide-svelte';

  let {
    open = false,
    onClose = () => {},
    onInsert = (_src: string, _alt: string) => {}
  }: {
    open?: boolean;
    onClose?: () => void;
    onInsert?: (src: string, alt: string) => void;
  } = $props();

  let funcs = $state<string[]>(['x^2']);
  let xMin = $state(-5);
  let xMax = $state(5);
  let yMin = $state(0);
  let yMax = $state(0);
  let autoY = $state(true);
  let showGrid = $state(true);
  let showLabels = $state(true);

  const errors = $derived(funcs.map((e) => validateExpression(e)));

  const svg = $derived.by(() => {
    const valid = funcs.some((e, i) => e.trim() && errors[i].ok);
    if (!valid) return '';
    try {
      return renderFunctionGraph({
        expressions: funcs,
        xMin,
        xMax,
        yMin: autoY ? null : yMin,
        yMax: autoY ? null : yMax,
        showGrid,
        showLabels
      });
    } catch {
      return '';
    }
  });

  const previewSrc = $derived(svg ? svgToDataUri(svg) : '');

  const allValid = $derived(funcs.every((e, i) => e.trim() === '' || errors[i].ok));

  function preset(kind: string) {
    if (kind === 'linear') {
      funcs = ['2x+1'];
      xMin = -5;
      xMax = 5;
    } else if (kind === 'quadratic') {
      funcs = ['x^2-4'];
      xMin = -5;
      xMax = 5;
    } else if (kind === 'cubic') {
      funcs = ['x^3-x'];
      xMin = -3;
      xMax = 3;
    } else if (kind === 'sine') {
      funcs = ['sin(x)'];
      xMin = -6.28;
      xMax = 6.28;
    } else if (kind === 'reciprocal') {
      funcs = ['1/x'];
      xMin = -5;
      xMax = 5;
    } else if (kind === 'sqrt') {
      funcs = ['sqrt(x)'];
      xMin = 0;
      xMax = 10;
    } else if (kind === 'intersect') {
      funcs = ['2x+1', 'x^2-4'];
      xMin = -5;
      xMax = 5;
    }
    autoY = true;
  }

  function addFunc() {
    funcs = [...funcs, 'x^2'];
  }
  function removeFunc(i: number) {
    funcs = funcs.filter((_, idx) => idx !== i);
  }

  function insert() {
    if (!allValid || !previewSrc) return;
    const joined = funcs.filter((e) => e.trim()).join(' ; ');
    onInsert(previewSrc, `Grafik ${joined}`);
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
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Fungsi (bisa lebih dari satu)</span>
            <Button variant="outline" size="sm" onclick={addFunc}><Plus class="h-3.5 w-3.5" /> Tambah fungsi</Button>
          </div>
          {#each funcs as expr, i (i)}
            <div class="flex items-center gap-2">
              <span class="w-6 shrink-0 text-right text-sm text-muted-foreground">f{i + 1}(x) =</span>
              <input
                bind:value={funcs[i]}
                placeholder="contoh: x^2-4, sin(x), 2x+1"
                class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={funcs.length <= 1}
                onclick={() => removeFunc(i)}
                title="Hapus fungsi"
                class="text-rose-600"
              ><Trash2 class="h-4 w-4" /></Button>
            </div>
            {#if !errors[i].ok && expr.trim()}
              <p class="-mt-1 text-xs text-rose-600">{errors[i].message}</p>
            {/if}
          {/each}
        </div>

        <div class="flex flex-wrap gap-1">
          {#each [['linear', 'Garis lurus'], ['quadratic', 'Parabola'], ['cubic', 'Kubik'], ['sine', 'Sinus'], ['reciprocal', 'Hiperbola'], ['sqrt', 'Akar'], ['intersect', '2 kurva']] as [k, label] (k)}
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

        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={showGrid} class="h-4 w-4 rounded border-border accent-primary" />
            Garis bantu
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={showLabels} class="h-4 w-4 rounded border-border accent-primary" />
            Label persamaan di ujung kurva
          </label>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border bg-slate-50 p-2">
          {#if previewSrc}
            <img src={previewSrc} alt="Pratinjau grafik" class="mx-auto max-h-72 w-auto" />
          {:else}
            <div class="grid h-40 place-items-center text-sm text-muted-foreground">
              <span>Tulis ekspresi fungsi yang valid untuk melihat pratinjau.</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" onclick={onClose}>Batal</Button>
        <Button onclick={insert} disabled={!allValid || !previewSrc}>Sisipkan</Button>
      </div>
    </div>
  </div>
{/if}