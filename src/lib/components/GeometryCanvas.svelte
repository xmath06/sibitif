<script lang="ts">
  import {
    GEOMETRY_SHAPES,
    geometryShape,
    renderShapeSvg,
    shapePixelSize,
    resolveItemPos,
    addSceneItem,
    resizeCanvasToContent,
    computeSceneLabels,
    computeSceneIntersections,
    GEOMETRY_STYLE,
    type GeoScene,
    type GeoSceneItem
  } from '$lib/geometry';
  import Button from './ui/Button.svelte';
  import GeometryDialog from './GeometryDialog.svelte';

  let {
    scene = $bindable(),
    editable = true,
    onChange = (_s: GeoScene) => {},
    pxPerUnit = 24,
    showToolbar = true
  }: {
    scene: GeoScene;
    editable?: boolean;
    onChange?: (s: GeoScene) => void;
    pxPerUnit?: number;
    showToolbar?: boolean;
  } = $props();

  let selectedId = $state<string | null>(null);
  let addOpen = $state(false);

  const selected = $derived(scene.items.find((i) => i.id === selectedId) ?? null);

  function commit() {
    scene = resizeCanvasToContent({ ...scene, items: scene.items.map((i) => ({ ...i })) }, pxPerUnit*2+10);
    onChange(scene);
  }

  function svgFor(it: GeoSceneItem): string {
    return renderShapeSvg(
      { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, showEdgeLengths: it.showEdgeLengths, skipLabels: true },
      pxPerUnit
    );
  }
  function sizeFor(it: GeoSceneItem) {
    return shapePixelSize(
      { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, labelStart: it.labelStart },
      pxPerUnit
    );
  }

  type Mode = 'move' | 'scale' | 'rotate';
  function startDrag(e: PointerEvent, it: GeoSceneItem, mode: Mode) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    selectedId = it.id;
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { x: it.x, y: it.y, scale: it.scale, rot: it.rotation ?? 0 };
    const itemEl = (e.currentTarget as HTMLElement).closest('[data-item]') as HTMLElement | null;
    const r = itemEl?.getBoundingClientRect();
    const cx = r ? r.left + r.width / 2 : sx;
    const cy = r ? r.top + r.height / 2 : sy;
    function move(ev: PointerEvent) {
      const cur = scene.items.find((i) => i.id === it.id);
      if (!cur) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (mode === 'move') {
        cur.x = o.x + dx;
        cur.y = o.y + dy;
      } else if (mode === 'scale') {
        cur.scale = Math.max(0.2, Math.min(4, o.scale + dx / 120));
      } else {
        cur.rotation = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      }
      // Perbesar kanvas live agar objek tetap terlihat penuh saat digeser.
      scene = resizeCanvasToContent(scene, pxPerUnit*2+10);
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      commit();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function addPicked(shapeId: string, params: Record<string, number>) {
    scene = addSceneItem(scene, shapeId, params);
    addOpen = false;
    commit();
  }
  function addLine() {
    scene = addSceneItem(scene, 'line', {});
    commit();
  }
  // Garis: seret salah satu ujung (endpoints[idx]) secara mandiri.
  function startEndpointDrag(e: PointerEvent, it: GeoSceneItem, idx: number) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    selectedId = it.id;
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { x: it.endpoints![idx].x, y: it.endpoints![idx].y };
    function move(ev: PointerEvent) {
      const cur = scene.items.find((i) => i.id === it.id);
      if (!cur || !cur.endpoints?.[idx]) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      const eps = [...cur.endpoints];
      eps[idx] = { x: o.x + dx, y: o.y + dy };
      cur.endpoints = eps;
      scene = resizeCanvasToContent(scene, pxPerUnit * 2 + 10);
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      commit();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  // Garis: seret badan untuk menggeser seluruh garis.
  function startLineBodyDrag(e: PointerEvent, it: GeoSceneItem) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    selectedId = it.id;
    const sx = e.clientX;
    const sy = e.clientY;
    const o = [it.endpoints![0], it.endpoints![1]].map((p) => ({ x: p.x, y: p.y }));
    function move(ev: PointerEvent) {
      const cur = scene.items.find((i) => i.id === it.id);
      if (!cur || !cur.endpoints?.[0] || !cur.endpoints?.[1]) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      cur.endpoints = [
        { x: o[0].x + dx, y: o[0].y + dy },
        { x: o[1].x + dx, y: o[1].y + dy }
      ];
      scene = resizeCanvasToContent(scene, pxPerUnit * 2 + 10);
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      commit();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function deleteSelected() {
    if (!selectedId) return;
    const id = selectedId;
    scene = {
      ...scene,
      items: scene.items
        .filter((i) => i.id !== id)
        .map((i) => (i.parentId === id ? { ...i, parentId: undefined } : i))
    };
    selectedId = null;
    scene = resizeCanvasToContent(scene, pxPerUnit*2+10);
    onChange(scene);
  }
  function patchSelected(patch: Partial<GeoSceneItem>) {
    if (!selectedId) return;
    scene = { ...scene, items: scene.items.map((i) => (i.id === selectedId ? { ...i, ...patch } : i)) };
    scene = resizeCanvasToContent(scene, pxPerUnit*2+10);
  }
  function setParent(pid: string) {
    patchSelected({ parentId: pid || undefined });
  }
</script>

<div class="geo-canvas">
  {#if editable}
    <div class="mb-2 flex flex-wrap items-center gap-2">
       {#if showToolbar}
         <Button size="sm" variant="outline" onclick={() => (addOpen = true)}>Tambah bangun</Button>
         <Button size="sm" variant="outline" onclick={addLine}>Tambah garis</Button>
       {/if}
      {#if selected && showToolbar}
        <Button size="sm" variant="outline" onclick={() => patchSelected({ showVertices: !selected!.showVertices })}>
          Label sudut: {selected.showVertices ? 'Aktif' : 'Mati'}
        </Button>
        {#if selected.shapeId === 'cylinder' || selected.shapeId === 'cone' || selected.shapeId === 'sphere'}
          <Button size="sm" variant="outline" onclick={() => patchSelected({ showEdgeLengths: !selected!.showEdgeLengths })}>
            Label panjang rusuk: {selected.showEdgeLengths ? 'Aktif' : 'Mati'}
          </Button>
        {/if}
        <select
          class="h-8 rounded border border-border bg-card px-2 text-xs"
          value={selected.parentId ?? ''}
          onchange={(e) => setParent((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">— tanpa parent —</option>
          {#each scene.items.filter((i) => i.id !== selected.id) as opt (opt.id)}
            <option value={opt.id}>{geometryShape(opt.shapeId)?.label} ({opt.id})</option>
          {/each}
        </select>
        <Button size="sm" variant="outline" class="text-rose-600" onclick={deleteSelected}>Hapus</Button>
      {/if}
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="relative overflow-auto rounded-lg border border-border bg-slate-50"
    style="width:{scene.width}px;height:{scene.height}px;max-width:100%"
    onpointerdown={() => (selectedId = null)}
  >
    {#each [...scene.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)) as it (it.id)}
      {#if it.shapeId === 'line' && it.endpoints && it.endpoints.length === 2}
        {@const p1 = it.endpoints[0]}
        {@const p2 = it.endpoints[1]}
        {@const minX = Math.min(p1.x, p2.x)}
        {@const minY = Math.min(p1.y, p2.y)}
        {@const w = Math.max(1, Math.abs(p2.x - p1.x))}
        {@const h = Math.max(1, Math.abs(p2.y - p1.y))}
        <div
          data-item
          class="absolute select-none"
          class:ring-2={selectedId === it.id}
          class:ring-primary={selectedId === it.id}
          style="left:{minX}px;top:{minY}px;width:{w}px;height:{h}px;cursor:move"
          onpointerdown={(e) => startLineBodyDrag(e, it)}
        >
          <svg class="absolute inset-0" viewBox="0 0 {w} {h}" style="width:{w}px;height:{h}px" onpointerdown={(e) => startLineBodyDrag(e, it)}>
            <line x1={p1.x - minX} y1={p1.y - minY} x2={p2.x - minX} y2={p2.y - minY} stroke="#1e3a8a" stroke-width="2" />
            <line x1={p1.x - minX} y1={p1.y - minY} x2={p2.x - minX} y2={p2.y - minY} stroke="transparent" stroke-width="14" />
          </svg>
          {#if editable && selectedId === it.id}
            <div
              class="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-primary bg-white"
              style="left:{p1.x - minX}px;top:{p1.y - minY}px"
              onpointerdown={(e) => startEndpointDrag(e, it, 0)}
              title="Seret ujung garis"
            ></div>
            <div
              class="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-primary bg-white"
              style="left:{p2.x - minX}px;top:{p2.y - minY}px"
              onpointerdown={(e) => startEndpointDrag(e, it, 1)}
              title="Seret ujung garis"
            ></div>
          {/if}
        </div>
      {:else}
        {@const ap = resolveItemPos(scene, it)}
        {@const sz = sizeFor(it)}
        <div
          data-item
          class="absolute select-none"
          class:ring-2={selectedId === it.id}
          class:ring-primary={selectedId === it.id}
          style="left:{ap.x}px;top:{ap.y}px;width:{sz.w}px;height:{sz.h}px;transform:rotate({it.rotation ?? 0}deg) scale({ap.scale});transform-origin:center;cursor:move"
          onpointerdown={(e) => startDrag(e, it, 'move')}
        >
          {@html svgFor(it)}
          {#if editable && selectedId === it.id}
            <div
              class="absolute -top-3 left-1/2 h-3.5 w-3.5 -translate-x-1/2 cursor-grab rounded-full border-2 border-emerald-500 bg-white"
              onpointerdown={(e) => {
                e.stopPropagation();
                startDrag(e, it, 'rotate');
              }}
              title="Tarik untuk memutar"
            ></div>
            <div
              class="absolute -bottom-1 -right-1 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-primary bg-white"
              onpointerdown={(e) => {
                e.stopPropagation();
                startDrag(e, it, 'scale');
              }}
              title="Tarik untuk mengubah ukuran"
            ></div>
          {/if}
        </div>
      {/if}
    {/each}

    <!-- Lapisan label (selalu tegak, tidak ikut rotasi, dan digabung bila berimpit) -->
    <svg
      class="pointer-events-none absolute inset-0"
      style="width:{scene.width}px;height:{scene.height}px"
      viewBox="0 0 {scene.width} {scene.height}"
    >
      {@html GEOMETRY_STYLE}
      {#each computeSceneLabels(scene, pxPerUnit) as l (l.x + '_' + l.y + '_' + l.letter)}
        <text class="lbl" x={l.x} y={l.y} text-anchor={l.anchor}>{l.letter}</text>
      {/each}
      {#each computeSceneIntersections(scene, pxPerUnit) as l (l.x + '_' + l.y + '_' + l.letter)}
        <text class="lbl" x={l.lx ?? l.x} y={l.ly ?? l.y + 5} text-anchor="middle">{l.letter}</text>
      {/each}
    </svg>
  </div>

  {#if editable && selected}
    {#if selected.shapeId === 'line'}
      <p class="mt-2 text-xs text-muted-foreground">Seret salah satu ujung biru pada kanvas untuk mengatur garis.</p>
    {:else}
    <div class="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-2 text-xs sm:grid-cols-4">
      <label class="flex flex-col gap-1">
        <div>
          <span class="text-muted-foreground">X</span>
          <input type="number" class="w-14 rounded border border-border bg-card px-1 py-0.5 text-xs" value={selected.x} oninput={(e) => patchSelected({ x: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
        </div>
        <div class="flex items-center gap-1">
          <input type="range" min="0" max={scene.width} step="1" value={selected.x} oninput={(e) => patchSelected({ x: Number((e.currentTarget as HTMLInputElement).value) })} />
        </div>
      </label>
      <label class="flex flex-col gap-1">
        <div>
          <span class="text-muted-foreground">Y</span>
          <input type="number" class="w-14 rounded border border-border bg-card px-1 py-0.5 text-xs" value={selected.y} oninput={(e) => patchSelected({ y: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
        </div> 
        <div class="flex items-center gap-1">
          <input type="range" min="0" max={scene.height} step="1" value={selected.y} oninput={(e) => patchSelected({ y: Number((e.currentTarget as HTMLInputElement).value) })} />
        </div>
      </label>
      <label class="flex flex-col gap-1">
        <div>
          <span class="text-muted-foreground">Skala {(selected.scale * 100).toFixed(0)}%</span>
          <input type="number" step="0.05" min="0.2" max="3" class="w-14 rounded border border-border bg-card px-1 py-0.5 text-xs" value={selected.scale} oninput={(e) => patchSelected({ scale: Number((e.currentTarget as HTMLInputElement).value) || 1 })} />
        </div>
        <div class="flex items-center gap-1">
          <input type="range" min="0.2" max="3" step="0.05" value={selected.scale} oninput={(e) => patchSelected({ scale: Number((e.currentTarget as HTMLInputElement).value) })} />
        </div>
      </label>
      <label class="flex flex-col gap-1">
        <div>
          <span class="text-muted-foreground">Rotasi {Math.round(selected.rotation ?? 0)}°</span>
          <input type="number" step="1" class="w-14 rounded border border-border bg-card px-1 py-0.5 text-xs" value={selected.rotation ?? 0} oninput={(e) => patchSelected({ rotation: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
        </div>
        <div class="flex items-center gap-1">
          <input type="range" min="-180" max="180" step="1" value={selected.rotation ?? 0} oninput={(e) => patchSelected({ rotation: Number((e.currentTarget as HTMLInputElement).value) })} />
        </div>
      </label>
    </div>
    {/if}
  {/if}

  <GeometryDialog open={addOpen} onClose={() => (addOpen = false)} onPick={addPicked} />
</div>
