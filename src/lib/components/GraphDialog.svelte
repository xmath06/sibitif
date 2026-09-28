<script lang="ts">
  import { renderFunctionGraph, svgToDataUri, validateExpression } from '$lib/graph';
  import { latexToExpr, exprToLatex } from '$lib/mathexpr';
  import 'mathlive';
  import Button from '$components/ui/Button.svelte';
  import { X, Plus, Trash2, Keyboard } from 'lucide-svelte';

  let {
    open = false,
    onClose = () => {},
    onInsert = (_src: string, _alt: string) => {}
  }: {
    open?: boolean;
    onClose?: () => void;
    onInsert?: (src: string, alt: string) => void;
  } = $props();

  interface Fn {
    expr: string;
    name: string;
    inverse: boolean;
  }
  const DEFAULT_LETTERS = ['f', 'g', 'h', 'p', 'q', 'r'];

  let funcs = $state<Fn[]>([{ expr: 'x^2', name: 'f', inverse: false }]);
  let xMin = $state(-5);
  let xMax = $state(5);
  let yMin = $state(0);
  let yMax = $state(0);
  let autoY = $state(true);
  let showGrid = $state(true);
  let showLabels = $state(true);
  let xUnit = $state<'rad' | 'deg'>('rad');
  let kbOpen = $state(false);

  // Ref <math-field> per baris fungsi (plain object — bukan $state)
  let mfRefs: Record<number, any> = {};

  const errors = $derived(funcs.map((fn) => validateExpression(fn.expr)));

  const svg = $derived.by(() => {
    const validFns = funcs.filter((fn, i) => fn.expr.trim() && errors[i].ok);
    if (!validFns.length) return '';
    try {
      return renderFunctionGraph({
        functions: validFns,
        xMin,
        xMax,
        yMin: autoY ? null : yMin,
        yMax: autoY ? null : yMax,
        showGrid,
        showLabels,
        xUnit
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

  // <math-field>: isi nilai awal + bookkeeping ref per indeks baris
  function initMf(node: HTMLElement, i: number) {
    const mf = node as any;
    mfRefs[i] = mf;
    if (!mf.value) mf.value = exprToLatex(funcs[i]?.expr ?? '');
    return {
      update(newI: number) {
        if (newI !== i) {
          delete mfRefs[i];
          i = newI;
        }
        mfRefs[i] = mf;
      },
      destroy() {
        if (mfRefs[i] === mf) delete mfRefs[i];
      }
    };
  }

  function onMfInput(i: number, e: Event) {
    const mf = e.currentTarget as any;
    setExpr(i, latexToExpr(mf.value ?? ''));
  }

  // Sinkron <math-field> setelah perubahan dari luar (preset/tambah/hapus fungsi)
  function syncMathFields() {
    requestAnimationFrame(() => {
      funcs.forEach((fn, i) => {
        const mf = mfRefs[i];
        if (mf && latexToExpr(mf.value ?? '') !== fn.expr) {
          mf.value = exprToLatex(fn.expr);
        }
      });
    });
  }

  function hideKb() {
    const vk = (window as any).mathVirtualKeyboard;
    if (vk?.visible) vk.hide();
    kbOpen = false;
  }
  function toggleKb() {
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;
    if (vk.visible) {
      vk.hide();
      kbOpen = false;
    } else {
      vk.show();
      kbOpen = true;
    }
  }
  function closeDialog() {
    hideKb();
    onClose();
  }

  function preset(kind: string) {
    const mk = (letters: string[], exprs: string[]): Fn[] =>
      exprs.map((expr, idx) => ({
        expr,
        name: letters[idx] ?? DEFAULT_LETTERS[idx % DEFAULT_LETTERS.length],
        inverse: false
      }));
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
      if (xUnit === 'deg') {
        xMin = -360;
        xMax = 360;
      } else {
        xMin = -6.28;
        xMax = 6.28;
      }
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
    } else if (kind === 'log') {
      funcs = mk(['f'], ['log(x)']);
      xMin = 0.1;
      xMax = 10;
    } else if (kind === 'logbase') {
      funcs = mk(['f'], ['log(x, 2)']);
      xMin = 0.1;
      xMax = 8;
    } else if (kind === 'sum') {
      funcs = mk(['f'], ['sum(i,1,10,x*i)']);
      xMin = -3;
      xMax = 3;
    }
    autoY = true;
    syncMathFields();
  }

  function addFunc() {
    const used = new Set(funcs.map((fn) => fn.name));
    const letter = DEFAULT_LETTERS.find((l) => !used.has(l)) ?? `f${funcs.length + 1}`;
    funcs = [...funcs, { expr: 'x^2', name: letter, inverse: false }];
    syncMathFields();
  }
  function removeFunc(i: number) {
    funcs = funcs.filter((_, idx) => idx !== i);
    syncMathFields();
  }

  function insert() {
    if (!allValid || !previewSrc) return;
    const joined = funcs
      .filter((fn) => fn.expr.trim())
      .map((fn) => `${fn.name}${fn.inverse ? '⁻¹' : ''}(x) = ${fn.expr}`)
      .join(' ; ');
    onInsert(previewSrc, `Grafik ${joined}`);
    hideKb();
    onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && closeDialog()}
    onkeydown={(e) => e.key === 'Escape' && closeDialog()}
  >
    <div class="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-5 shadow-xl animate-fade-in">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Grafik Fungsi</h3>
        <button onclick={closeDialog} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>

      <!-- Landscape 2 kolom: kiri = input + pengaturan, kanan = gambar grafik -->
      <div class="grid gap-4 md:grid-cols-2">
        <div class="min-w-0 space-y-3">
        <!-- INPUT FUNGSI (prioritas utama — editor persamaan ala MathLive) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Fungsi</span>
            <div class="flex items-center gap-1">
              <Button variant="outline" size="sm" onclick={toggleKb} title="Keyboard persamaan">
                <Keyboard class="h-3.5 w-3.5" /> {kbOpen ? 'Sembunyikan' : 'Keyboard'}
              </Button>
              <Button variant="outline" size="sm" onclick={addFunc}><Plus class="h-3.5 w-3.5" /> Tambah</Button>
            </div>
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
              <math-field
                use:initMf={i}
                virtual-keyboard-mode="manual"
                class="min-w-0 flex-1"
                oninput={(e: Event) => onMfInput(i, e)}
              ></math-field>
              <Button
                variant="ghost"
                size="icon"
                disabled={funcs.length <= 1}
                onclick={() => removeFunc(i)}
                title="Hapus fungsi"
                class="text-rose-600"
              ><Trash2 class="h-4 w-4" /></Button>
            </div>
            <div class="flex flex-wrap items-center gap-4 pl-1">
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

        <!-- PENGATURAN (sekunder — terlipat agar bingkai fokus ke input & kanvas) -->
        <details class="rounded-lg border border-border bg-card">
          <summary class="cursor-pointer select-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Pengaturan — preset, rentang sumbu, garis bantu
          </summary>
          <div class="space-y-3 border-t border-border px-3 py-3">
            <div class="flex flex-wrap gap-1">
              {#each [['linear', 'Garis lurus'], ['quadratic', 'Parabola'], ['cubic', 'Kubik'], ['sine', 'Sinus'], ['reciprocal', 'Hiperbola'], ['sqrt', 'Akar'], ['log', 'Log'], ['logbase', 'Log basis 2'], ['sum', 'Sigma Σ'], ['intersect', '2 kurva'], ['inverse', 'Fungsi & invers']] as [k, label] (k)}
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
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={xUnit === 'deg'} onchange={(e) => (xUnit = (e.currentTarget as HTMLInputElement).checked ? 'deg' : 'rad')} class="h-4 w-4 rounded border-border accent-primary" />
                Sumbu x dalam derajat (trigonometri)
              </label>
            </div>
          </div>
        </details>
        </div>

        <!-- KANAN: gambar grafik (sticky — tetap terlihat saat kolom kiri di-scroll) -->
        <div class="min-w-0 self-start md:sticky md:top-0">
          <div class="overflow-x-auto rounded-lg border border-border bg-slate-50 p-2">
            {#if previewSrc}
              <img src={previewSrc} alt="Pratinjau grafik" class="mx-auto max-h-[70vh] w-auto" />
            {:else}
              <div class="grid h-64 place-items-center text-sm text-muted-foreground">
                <span>Tulis ekspresi fungsi yang valid untuk melihat pratinjau.</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" onclick={closeDialog}>Batal</Button>
        <Button onclick={insert} disabled={!allValid || !previewSrc}>Sisipkan</Button>
      </div>
    </div>
  </div>
{/if}
