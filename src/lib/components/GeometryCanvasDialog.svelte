<script lang="ts">
  import GeometryCanvas from './GeometryCanvas.svelte';
  import Button from './ui/Button.svelte';
  import { emptyScene, type GeoScene } from '$lib/geometry';
  import { X } from 'lucide-svelte';

  let {
    open = false,
    scene = undefined as GeoScene | undefined,
    onClose = () => {},
    onSave = (_s: GeoScene) => {}
  }: {
    open?: boolean;
    scene?: GeoScene;
    onClose?: () => void;
    onSave?: (s: GeoScene) => void;
  } = $props();

  let draft = $state<GeoScene>(emptyScene());

  // Sinkronkan draft setiap dialog dibuka (isi dari scene yang diedit, atau kosong).
  $effect(() => {
    if (open) draft = scene ? (JSON.parse(JSON.stringify(scene)) as GeoScene) : emptyScene();
  });

  function save() {
    onSave(draft);
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
    <div class="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-card p-5 shadow-xl animate-fade-in">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground">Canvas Bangun Geometri (drag &amp; drop)</h3>
        <button onclick={onClose} class="text-muted-foreground hover:text-foreground"><X class="h-5 w-5" /></button>
      </div>
      <p class="mb-3 text-xs leading-relaxed text-muted-foreground">
        Tarik tiap bangun untuk memindahkan. Tarik titik biru di pojok untuk mengubah ukuran.
        Pilih sebuah bangun lalu tentukan <em>parent</em> agar menjadi objek di dalam objek — ia akan
        bergerak dan ikut diskala bersama induknya.
      </p>
      <GeometryCanvas bind:scene={draft} editable={true} />
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" onclick={onClose}>Batal</Button>
        <Button onclick={save} disabled={!draft.items.length}>Simpan ke soal</Button>
      </div>
    </div>
  </div>
{/if}
