<script lang="ts">
  import { GEOMETRY_SHAPES, geometryShape, renderGeometry, geometryToDataUri } from '$lib/geometry';
  import Button from '$components/ui/Button.svelte';
  import { X } from 'lucide-svelte';

  let {
    open = false,
    onClose = () => {},
    onInsert = (_src: string, _alt: string) => {}
  }: {
    open?: boolean;
    onClose?: () => void;
    onInsert?: (src: string, alt: string) => void;
  } = $props();

  let shapeId = $state('square');
  let params = $state<Record<string, number>>({});
  let showVertices = $state(true);
  let showSides = $state(false);

  function resetParams(id: string) {
    const def = geometryShape(id);
    const p: Record<string, number> = {};
    if (def) for (const q of def.params) p[q.key] = q.def;
    params = p;
  }

  function selectShape(id: string) {
    shapeId = id;
    resetParams(id);
  }

  const svg = $derived.by(() => {
    try {
      return renderGeometry({ shapeId, params, showVertices, showSides });
    } catch {
      return '';
    }
  });
  const previewSrc = $derived(svg ? geometryToDataUri(svg) : '');
  const def = $derived(geometryShape(shapeId));

  function insert() {
    if (!previewSrc) return;
    const label = def?.label ?? 'Bangun geometri';
    onInsert(previewSrc, `Gambar ${label.toLowerCase()}`);
    onClose();
  }

  $effect(() => {
    if (open) resetParams(shapeId);
  });
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
    <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-5 shadow-xl animate-fade-in">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Bangun Geometri</h3>
        <button onclick={onClose} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>

      <div class="space-y-4">
        <div>
          <span class="mb-1 block text-sm font-medium">Bangun</span>
          <div class="grid grid-cols-4 gap-1.5">
            {#each GEOMETRY_SHAPES as s (s.id)}
              <button
                onclick={() => selectShape(s.id)}
                class={[
                  'rounded-lg border px-2 py-1.5 text-xs transition-colors',
                  shapeId === s.id ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-card text-foreground hover:bg-accent'
                ].join(' ')}
              >
                {s.label}
                {#if s.kind === '3d'}<span class="ml-0.5 align-super text-[9px] text-muted-foreground">3D</span>{/if}
              </button>
            {/each}
          </div>
        </div>

        {#if def && def.params.length}
          <div class="grid grid-cols-3 gap-3">
            {#each def.params as q (q.key)}
              <label class="block">
                <span class="mb-1 block text-sm font-medium">{q.label}</span>
                <input
                  type="number"
                  step="any"
                  min="0.5"
                  value={params[q.key]}
                  oninput={(e) => (params = { ...params, [q.key]: Number((e.currentTarget as HTMLInputElement).value) })}
                  class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            {/each}
          </div>
        {/if}

        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={showVertices} class="h-4 w-4 rounded border-border accent-primary" />
            Label titik sudut (A, B, C, …)
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={showSides} class="h-4 w-4 rounded border-border accent-primary" />
            Tampilkan panjang sisi
          </label>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border bg-slate-50 p-2">
          {#if previewSrc}
            <img src={previewSrc} alt="Pratinjau bangun geometri" class="mx-auto max-h-72 w-auto" />
          {:else}
            <div class="grid h-40 place-items-center text-sm text-muted-foreground"><span>Gagal merender bangun.</span></div>
          {/if}
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" onclick={onClose}>Batal</Button>
        <Button onclick={insert} disabled={!previewSrc}>Sisipkan</Button>
      </div>
    </div>
  </div>
{/if}