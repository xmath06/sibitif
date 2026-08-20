<script lang="ts">
  import { GEOMETRY_SHAPES, geometryShape, renderGeometry, geometryToDataUri, type GeometryItem } from '$lib/geometry';
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

  interface Item extends GeometryItem {}
  let items = $state<Item[]>([{ shapeId: 'square', params: {} }]);
  let showVertices = $state(true);
  let showSides = $state(false);

  function defaultParams(id: string): Record<string, number> {
    const def = geometryShape(id);
    const p: Record<string, number> = {};
    if (def) for (const q of def.params) p[q.key] = q.def;
    return p;
  }

  function addItem() {
    const id = 'square';
    items = [...items, { shapeId: id, params: defaultParams(id) }];
  }
  function removeItem(i: number) {
    items = items.filter((_, idx) => idx !== i);
  }
  function setShape(i: number, id: string) {
    items = items.map((it, idx) => (idx === i ? { ...it, shapeId: id, params: defaultParams(id) } : it));
  }
  function setParam(i: number, key: string, v: number) {
    items = items.map((it, idx) => (idx === i ? { ...it, params: { ...it.params, [key]: v } } : it));
  }
  function setLabelStart(i: number, v: string) {
    items = items.map((it, idx) => (idx === i ? { ...it, labelStart: v.toUpperCase() } : it));
  }

  // Pratinjau memakai per-item toggle agar sesuai hasil akhir.
  const previewItems = $derived.by(() =>
    items.map((it) => ({ ...it, showVertices, showSides }))
  );
  const previewSrc = $derived.by(() => {
    try {
      const s = renderGeometry({ items: previewItems });
      return s ? geometryToDataUri(s) : '';
    } catch {
      return '';
    }
  });

  function insert() {
    if (!previewSrc || !items.length) return;
    const labels = items.map((it, i) => {
      const d = geometryShape(it.shapeId);
      return `(${String.fromCharCode(97 + i)}) ${d?.label.toLowerCase() ?? ''}`;
    });
    onInsert(previewSrc, `Gambar ${labels.join(' ')}`);
    onClose();
  }

  $effect(() => {
    if (open) {
      items = [{ shapeId: 'square', params: defaultParams('square') }];
    }
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
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Bangun dalam gambar ({items.length})</span>
            <Button variant="outline" size="sm" onclick={addItem}><Plus class="h-3.5 w-3.5" /> Tambah bangun</Button>
          </div>

          {#each items as it, i (i)}
            <div class="rounded-xl border border-border p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bangun {String.fromCharCode(97 + i)}</span>
                <Button variant="ghost" size="icon" onclick={() => removeItem(i)} disabled={items.length <= 1}><Trash2 class="h-4 w-4 text-rose-600" /></Button>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-3 flex items-end gap-3">
                  <div class="min-w-0 flex-1">
                    <select value={it.shapeId} onchange={(e) => setShape(i, (e.currentTarget as HTMLSelectElement).value)} class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <optgroup label="2D">
                        {#each GEOMETRY_SHAPES.filter((s) => s.kind === '2d') as s (s.id)}
                          <option value={s.id}>{s.label}</option>
                        {/each}
                      </optgroup>
                      <optgroup label="3D">
                        {#each GEOMETRY_SHAPES.filter((s) => s.kind === '3d') as s (s.id)}
                          <option value={s.id}>{s.label}</option>
                        {/each}
                      </optgroup>
                    </select>
                  </div>
                  <label class="block w-16">
                    <span class="mb-1 block text-xs font-medium text-muted-foreground">Huruf awal</span>
                    <input
                      type="text"
                      maxlength="1"
                      value={it.labelStart ?? 'A'}
                      oninput={(e) => setLabelStart(i, (e.currentTarget as HTMLInputElement).value)}
                      class="h-10 w-full rounded-lg border border-border bg-card px-2 text-center text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                      title="Huruf awal label titik sudut (mis. A, D, K)"
                    />
                  </label>
                </div>
                {#each geometryShape(it.shapeId)?.params ?? [] as q (q.key)}
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium">{q.label}</span>
                    <input
                      type="number"
                      step="any"
                      min="0.5"
                      value={it.params[q.key]}
                      oninput={(e) => setParam(i, q.key, Number((e.currentTarget as HTMLInputElement).value))}
                      class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                {/each}
              </div>
            </div>
          {/each}
        </div>

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