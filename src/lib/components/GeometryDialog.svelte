<script lang="ts">
  import {
    GEOMETRY_SHAPES,
    geometryShape,
    emptyScene,
    addSceneItem,
    fitSceneToContent,
    resizeCanvasToContent,
    sceneToDataUri,
    type GeoScene
  } from '$lib/geometry';
  import Button from '$components/ui/Button.svelte';
  import GeometryCanvas from './GeometryCanvas.svelte';
  import { X, Plus, Trash2 } from 'lucide-svelte';

  let {
    open = false,
    onClose = () => {},
    onInsert = (_src: string, _alt: string, _zoom?: number, _offset?: string) => {},
    onPick
  }: {
    open?: boolean;
    onClose?: () => void;
    onInsert?: (src: string, alt: string, zoom?: number, offset?: string) => void;
    onPick?: (shapeId: string, params: Record<string, number>) => void;
  } = $props();

  function defaultParams(id: string): Record<string, number> {
    const def = geometryShape(id);
    const p: Record<string, number> = {};
    if (def) for (const q of def.params) p[q.key] = q.def;
    return p;
  }

  function freshScene(): GeoScene {
    const s: GeoScene = { ...emptyScene(), width: 320, height: 240 };
    return fitSceneToContent(addSceneItem(s, 'square', defaultParams('square')));
  }

  let scene = $state<GeoScene>(freshScene());
  let showVertices = $state(true);
  let showSides = $state(false);
  let showEdgeLengths = $state(false);

  function addItem() {
    const s = addSceneItem(scene, 'square', defaultParams('square'));
    const last = s.items[s.items.length - 1];
    last.showVertices = showVertices;
    last.showSides = showSides;
    last.showEdgeLengths = showEdgeLengths;
    scene = resizeCanvasToContent(s);
  }
  function addLineItem() {
    scene = resizeCanvasToContent(addSceneItem(scene, 'line', {}));
  }
  function removeItem(i: number) {
    const id = scene.items[i]?.id;
    scene = resizeCanvasToContent({
      ...scene,
      items: scene.items
        .filter((_, idx) => idx !== i)
        .map((it) => (it.parentId === id ? { ...it, parentId: undefined } : it))
    });
  }
  function setShape(i: number, id: string) {
    scene = resizeCanvasToContent({
      ...scene,
      items: scene.items.map((it, idx) => (idx === i ? { ...it, shapeId: id, params: defaultParams(id) } : it))
    });
  }
  function setParam(i: number, key: string, v: number) {
    if (!Number.isFinite(v) || v <= 0) return;
    scene = resizeCanvasToContent({
      ...scene,
      items: scene.items.map((it, idx) => (idx === i ? { ...it, params: { ...it.params, [key]: v } } : it))
    });
  }
  function setLabelStart(i: number, v: string) {
    scene = {
      ...scene,
      items: scene.items.map((it, idx) => (idx === i ? { ...it, labelStart: v.toUpperCase() } : it))
    };
  }
  function setShowVertices(v: boolean) {
    showVertices = v;
    scene = { ...scene, items: scene.items.map((it) => ({ ...it, showVertices: v })) };
  }
  function setShowSides(v: boolean) {
    showSides = v;
    scene = { ...scene, items: scene.items.map((it) => ({ ...it, showSides: v })) };
  }
  function setShowEdgeLengths(v: boolean) {
    showEdgeLengths = v;
    scene = { ...scene, items: scene.items.map((it) => ({ ...it, showEdgeLengths: v })) };
  }

  const previewSrc = $derived.by(() => {
    try {
      return scene.items.length ? sceneToDataUri(fitSceneToContent(scene)) : '';
    } catch {
      return '';
    }
  });

  function insert() {
    if (!previewSrc || !scene.items.length) return;
    if (onPick) {
      onPick(scene.items[0].shapeId, scene.items[0].params);
      onClose();
      return;
    }
    const labels = scene.items.map(
      (it, i) => `(${String.fromCharCode(97 + i)}) ${geometryShape(it.shapeId)?.label.toLowerCase() ?? ''}`
    );
    onInsert(previewSrc, `Gambar ${labels.join(' ')}`);
    onClose();
  }

  $effect(() => {
    if (open) {
      scene = freshScene();
      showVertices = true;
      showSides = false;
      showEdgeLengths = false;
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
    <div class="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-card p-5 shadow-xl animate-fade-in">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Bangun Geometri (susun & gabungkan)</h3>
        <button onclick={onClose} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>

      <div class="space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Bangun dalam gambar ({scene.items.length})</span>
            <Button variant="outline" size="sm" onclick={addItem}><Plus class="h-3.5 w-3.5" /> Tambah bangun</Button>
        <Button variant="outline" size="sm" onclick={addLineItem}><Plus class="h-3.5 w-3.5" /> Tambah garis</Button>
          </div>

          {#each scene.items as it, i (it.id)}
            <div class="rounded-xl border border-border p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bangun {String.fromCharCode(97 + i)}</span>
                <Button variant="ghost" size="icon" onclick={() => removeItem(i)} disabled={scene.items.length <= 1}
                  ><Trash2 class="h-4 w-4 text-rose-600" /></Button
                >
              </div>
              {#if it.shapeId === 'line'}
                <p class="text-xs text-muted-foreground">Garis — seret salah satu ujungnya di kanvas untuk mengatur letak.</p>
              {:else}
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-3 flex items-end gap-3">
                  <div class="min-w-0 flex-1">
                    <select
                      value={it.shapeId}
                      onchange={(e) => setShape(i, (e.currentTarget as HTMLSelectElement).value)}
                      class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
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
                      <optgroup label="Lainnya">
                        {#each GEOMETRY_SHAPES.filter((s) => s.kind === 'line') as s (s.id)}
                          <option value={s.id}>{s.label}</option>
                        {/each}
                      </optgroup>
                    </select>
                  </div>
                  <!-- <label class="block w-16">
                    <span class="mb-1 block text-xs font-medium text-muted-foreground">Huruf awal</span>
                    <input
                      type="text"
                      maxlength="1"
                      value={it.labelStart ?? 'A'}
                      oninput={(e) => setLabelStart(i, (e.currentTarget as HTMLInputElement).value)}
                      class="h-10 w-full rounded-lg border border-border bg-card px-2 text-center text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                      title="Huruf awal label titik sudut (mis. A, D, K)"
                    />
                  </label> -->
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
              {/if}
            </div>
          {/each}
        </div>

        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showVertices} onchange={(e) => setShowVertices((e.currentTarget as HTMLInputElement).checked)} class="h-4 w-4 rounded border-border accent-primary" />
            Label titik sudut (A, B, C, …)
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showSides} onchange={(e) => setShowSides((e.currentTarget as HTMLInputElement).checked)} class="h-4 w-4 rounded border-border accent-primary" />
            Tampilkan panjang sisi
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showEdgeLengths} onchange={(e) => setShowEdgeLengths((e.currentTarget as HTMLInputElement).checked)} class="h-4 w-4 rounded border-border accent-primary" />
            Label panjang rusuk (tabung/kerucut/bola)
          </label>
        </div>

        <div>
          <p class="mb-2 text-xs text-muted-foreground">
            Tarik tiap bangun untuk memindahkan · tarik titik biru di pojok untuk mengubah ukuran · untuk Garis, seret salah satu ujungnya · gabungkan dengan mendekatkan bangun.
          </p>
          <GeometryCanvas bind:scene={scene} editable={true} showToolbar={false} />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" onclick={onClose}>Batal</Button>
        <Button onclick={insert} disabled={!previewSrc}>Sisipkan</Button>
      </div>
    </div>
  </div>
{/if}
