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

  interface Fn { expr: string; name: string; inverse: boolean }
  const DEFAULT_LETTERS = ['f', 'g', 'h', 'p', 'q', 'r'];

  let funcs = $state<Fn[]>([{ expr: 'x^2', name: 'f', inverse: false }]);
  let xMin = $state(-5);
  let xMax = $state(5);
  let yMin = $state(0);
  let yMax = $state(0);
  let autoY = $state(true);
  let showGrid = $state(true);
  let showLabels = $state(true);

  const errors = $derived(funcs.map((fn) => validateExpression(fn.expr)));

  const svg = $derived.by(() => {
    const valid = funcs.some((fn, i) => fn.expr.trim() && errors[i].ok);
    if (!valid) return '';
    try {
      return renderFunctionGraph({
        functions: funcs,
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

  const allValid = $derived(funcs.every((fn, i) => fn.expr.trim() === '' || errors[i].ok));

  function setExpr(i: number, v: string) {
    funcs = funcs.map((fn, idx) => (idx === i ? { ...fn, expr: v } : fn));
  }
  function setName(i: number, v: string) {
    funcs = funcs.map((fn, idx) => (idx === i ? { ...fn, name: v } : fn));
  }
  function toggleInverse(i: number) {
    funcs = funcs.map((fn, idx) => (idx === i ? { ...fn, inverse: !fn.inverse } : fn));
  }

  function preset(kind: string) {
    const mk = (letters: string[], exprs: string[]): Fn[] =>
      exprs.map((expr, idx) => ({ expr, name: letters[idx] ?? DEFAULT_LETTERS[idx % DEFAULT_LETTERS.length], inverse: false }));
    if (kind === 'linear') {
      funcs = mk(['f'], ['2x+1']);
      xMin = -5;
      xMax = 5;
    } else if (kind === 'quadratic') {
      funcs = mk(['f'], ['x^2-4']);
      xMin = -5;
      xMax = 5;
    } else if (kind === 'cubic') {
      funcs = mk(['f'], ['x^3-x']);
      xMin = -3;
      xMax = 3;
    } else if (kind === 'sine') {
      funcs = mk(['f'], ['sin(x)']);
      xMin = -6.28;
      xMax = 6.28;
    } else if (kind === 'reciprocal') {
      funcs = mk(['f'], ['1/x']);
      xMin = -5;
      xMax = 5;
    } else if (kind === 'sqrt') {
      funcs = mk(['f'], ['sqrt(x)']);
      xMin = 0;
      xMax = 10;
    } else if (kind === 'intersect') {
      funcs = mk(['f', 'g'], ['2x+1', 'x^2-4']);
      xMin = -5;
      xMax = 5;
    } else if (kind === 'inverse') {
      // pasangan fungsi & inversnya (notasi f⁻¹, cukup contoh sederhana)
      funcs = mk(['f', 'g'], ['x^2', 'sqrt(x)']);
      xMin = 0;
      xMax = 5;
    }
    autoY = true;
  }

  function addFunc() {
    const used = new Set(funcs.map((fn) => fn.name));
    const letter = DEFAULT_LETTERS.find((l) => !used.has(l)) ?? `f${funcs.length + 1}`;
    funcs = [...funcs, { expr: 'x^2', name: letter, inverse: false }];
  }
  function removeFunc(i: number) {
    funcs = funcs.filter((_, idx) => idx !== i);
  }

  function insert() {
    if (!allValid || !previewSrc) return;
    const joined = funcs
      .filter((fn) => fn.expr.trim())
      .map((fn) => `${fn.name}${fn.inverse ? '⁻¹' : ''}(x) = ${fn.expr}`)
      .join(' ; ');
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
        <h3 class="text-sm font-semibold text-foreground">Grafik Fungsi</h3>
        <button onclick={onClose} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>

      <div class="space-y-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Fungsi (bisa lebih dari satu)</span>
            <Button variant="outline" size="sm" onclick={addFunc}><Plus class="h-3.5 w-3.5" /> Tambah fungsi</Button>
          </div>
          {#each funcs as fn, i (i)}
            <div class="flex flex-wrap items-center gap-2">
              <input
                bind:value={funcs[i].name}
                oninput={(e) => setName(i, (e.currentTarget as HTMLInputElement).value)}
                class="h-10 w-12 rounded-lg border border-border bg-card px-2 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                title="Huruf fungsi (mis. f, g, h)"
                maxlength="2"
              />
              <span class="text-sm text-muted-foreground">(x) =</span>
              <input
                bind:value={funcs[i].expr}
                oninput={(e) => setExpr(i, (e.currentTarget as HTMLInputElement).value)}
                placeholder="contoh: x^2-4, sin(x), 2x+1"
                class="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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
            <div class="flex items-center gap-4 pl-1">
              {#if !errors[i].ok && fn.expr.trim()}
                <span class="text-xs text-rose-600">{errors[i].message}</span>
              {/if}
              <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={fn.inverse} onchange={() => toggleInverse(i)} class="h-3.5 w-3.5 rounded border-border accent-primary" />
                Invers ({fn.name || 'f'}⁻¹)
              </label>
            </div>
          {/each}
        </div>

        <div class="flex flex-wrap gap-1">
          {#each [['linear', 'Garis lurus'], ['quadratic', 'Parabola'], ['cubic', 'Kubik'], ['sine', 'Sinus'], ['reciprocal', 'Hiperbola'], ['sqrt', 'Akar'], ['intersect', '2 kurva'], ['inverse', 'Fungsi & invers']] as [k, label] (k)}
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