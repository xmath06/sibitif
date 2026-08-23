<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, Node, mergeAttributes } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Image from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import Table from '@tiptap/extension-table';
  import TableRow from '@tiptap/extension-table-row';
  import TableHeader from '@tiptap/extension-table-header';
  import TableCell from '@tiptap/extension-table-cell';
  import katex from 'katex';
  import 'mathlive';
  import { ImageIcon, Loader2, Sigma, Bold, Italic, List, ListOrdered, Heading2, Table2, ChartLine, Box, Layers } from 'lucide-svelte';
  import { api } from '$api/client';
  import Button from '$components/ui/Button.svelte';
  import GraphDialog from '$components/GraphDialog.svelte';
  import GeometryDialog from '$components/GeometryDialog.svelte';
  import GeometryCanvasDialog from '$components/GeometryCanvasDialog.svelte';
  import { cn } from '$lib/utils';
  import { emptyScene, sceneToDataUri, type GeoScene } from '$lib/geometry';

  // Node LaTeX atom: disimpan sebagai <span class="math-latex" data-latex="…">
  // dan di-render menjadi persamaan (bukan script) baik di editor maupun saat ditampilkan.
  const MathNode = Node.create({
    name: 'math',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,
    addAttributes() {
      return {
        latex: {
          default: '',
          parseHTML: (el) => el.getAttribute('data-latex') || '',
          renderHTML: (attrs) => ({ 'data-latex': attrs.latex })
        }
      };
    },
    parseHTML() {
      return [{ tag: 'span.math-latex' }];
    },
    renderHTML({ node }) {
      return ['span', mergeAttributes({ class: 'math-latex' }, { 'data-latex': node.attrs.latex })];
    },
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement('span');
        dom.className = 'math-latex';
        dom.setAttribute('data-latex', node.attrs.latex || '');
        try {
          dom.innerHTML = katex.renderToString(node.attrs.latex || '', {
            throwOnError: false,
            displayMode: false,
            output: 'html'
          });
        } catch {
          dom.textContent = node.attrs.latex || '';
        }
        return { dom };
      };
    }
  });

  // Node blok grafik fungsi: disimpan sebagai <img data-graph src="data:image/svg+xml;base64,…">
  // agar self-contained di questionText (render di editor, halaman soal, dan ekspor docx → [gambar]).
  const GraphNode = Node.create({
    name: 'graph',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        src: {
          default: '',
          parseHTML: (el) => el.getAttribute('src') || '',
          renderHTML: (attrs) => ({ src: attrs.src })
        },
        alt: {
          default: '',
          parseHTML: (el) => el.getAttribute('alt') || '',
          renderHTML: (attrs) => ({ alt: attrs.alt })
        }
      };
    },
    parseHTML() {
      return [{ tag: 'img[data-graph]' }];
    },
    renderHTML({ node }) {
      return ['img', mergeAttributes({ 'data-graph': '', class: 'math-graph' }, node.attrs)];
    },
    addNodeView() {
      return ({ node }) => {
        const img = document.createElement('img');
        img.className = 'math-graph max-h-72 w-auto';
        img.setAttribute('data-graph', '');
        img.src = node.attrs.src || '';
        img.alt = node.attrs.alt || 'Grafik';
        return { dom: img };
      };
    }
  });

  // Transform CSS dari zoom/offset agar dibakar ke dalam <img> (berlaku juga di
  // tampilan siswa tanpa JS tambahan).
  function geometryTransform(zoom: unknown, offset: unknown): string {
    const z = Number(zoom) || 1;
    const [ox, oy] = String(offset ?? '0,0')
      .split(',')
      .map((n) => Number(n) || 0);
    return `transform: translate(${ox}px, ${oy}px) scale(${z}); transform-origin: center;`;
  }

  // Node blok bangun geometri: disimpan sebagai <img data-geometry src="data:image/svg+xml;…">
  // dengan zoom & offset dibakar ke atribut style.
  const GeometryNode = Node.create({
    name: 'geometry',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        src: {
          default: '',
          parseHTML: (el) => el.getAttribute('src') || '',
          renderHTML: (attrs) => ({ src: attrs.src })
        },
        alt: {
          default: 'Bangun geometri',
          parseHTML: (el) => el.getAttribute('alt') || '',
          renderHTML: (attrs) => ({ alt: attrs.alt })
        },
        zoom: {
          default: 1,
          parseHTML: (el) => Number(el.getAttribute('data-zoom')) || 1,
          renderHTML: (attrs) => ({ 'data-zoom': attrs.zoom })
        },
        offset: {
          default: '0,0',
          parseHTML: (el) => el.getAttribute('data-offset') || '0,0',
          renderHTML: (attrs) => ({ 'data-offset': attrs.offset })
        }
      };
    },
    parseHTML() {
      return [{ tag: 'img[data-geometry]' }];
    },
    renderHTML({ node }) {
      const style = geometryTransform(node.attrs.zoom, node.attrs.offset);
      return ['img', mergeAttributes({ 'data-geometry': '', class: 'math-graph max-h-80 w-auto', style }, node.attrs)];
    },
    addNodeView() {
      return ({ node }) => {
        const img = document.createElement('img');
        img.className = 'math-graph max-h-80 w-auto';
        img.setAttribute('data-geometry', '');
        img.src = node.attrs.src || '';
        img.alt = node.attrs.alt || 'Bangun geometri';
        img.setAttribute('data-zoom', String(node.attrs.zoom ?? 1));
        img.setAttribute('data-offset', String(node.attrs.offset ?? '0,0'));
        img.setAttribute('style', geometryTransform(node.attrs.zoom, node.attrs.offset));
        return { dom: img };
      };
    }
  });

  // Node blok canvas geometri interaktif: menyimpan scene JSON (+ preview statis).
  // Di editor ditampilkan sebagai gambar pratinjau (src), siswa/ekspor melihat
  // gambar yang sama. Edit melalui dialog (double-click pada gambar di editor).
  const GeometryCanvasNode = Node.create({
    name: 'geometryCanvas',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        scene: {
          default: '{}',
          parseHTML: (el) => el.getAttribute('data-scene') || '{}',
          renderHTML: (attrs) => ({ 'data-scene': attrs.scene })
        },
        src: {
          default: '',
          parseHTML: (el) => el.getAttribute('src') || '',
          renderHTML: (attrs) => ({ src: attrs.src })
        },
        alt: {
          default: 'Canvas geometri',
          parseHTML: (el) => el.getAttribute('alt') || '',
          renderHTML: (attrs) => ({ alt: attrs.alt })
        }
      };
    },
    parseHTML() {
      return [{ tag: 'img[data-geometry-canvas]' }];
    },
    renderHTML({ node }) {
      return ['img', mergeAttributes({ 'data-geometry-canvas': '', class: 'math-graph max-h-80 w-auto' }, node.attrs)];
    },
    addNodeView() {
      return ({ node }) => {
        const img = document.createElement('img');
        img.className = 'math-graph max-h-80 w-auto';
        img.setAttribute('data-geometry-canvas', '');
        img.src = node.attrs.src || '';
        img.alt = node.attrs.alt || 'Canvas geometri';
        img.addEventListener('dblclick', () =>
          img.dispatchEvent(new CustomEvent('geometry-canvas-edit', { bubbles: true, detail: { scene: node.attrs.scene } }))
        );
        return { dom: img };
      };
    }
  });

  let {
    value = '',
    placeholder = 'Tulis jawaban atau soal di sini…',
    disabled = false,
    onChange = (_html: string) => {},
    minWordCount = null,
    maxWordCount = null,
    showFlash = true,
    compact = false,
    allowFigures = true
  }: {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    onChange?: (html: string) => void;
    minWordCount?: number | null;
    maxWordCount?: number | null;
    showFlash?: boolean;
    // Mode ringkas untuk opsi jawaban: toolbar dibatasi (tebal/miring/rumus),
    // tanpa tabel/gambar/list/judul, tinggi kecil.
    compact?: boolean;
    // Izinkan sisipan grafik & bangun geometri. Default true (bank soal).
    // False untuk editor jawaban siswa.
    allowFigures?: boolean;
  } = $props();

  let el: HTMLDivElement;
  let editor = $state<Editor | null>(null);
  let uploading = $state(false);
  let imgInput: HTMLInputElement;
  let mathOpen = $state(false);
  let mathField = $state<any>(null);
  let graphOpen = $state(false);
  let geometryOpen = $state(false);
  let canvasOpen = $state(false);
  let editingScene = $state<GeoScene | undefined>(undefined);
  let tableActive = $state(false);
  let saveFlash = $state<'idle' | 'saving' | 'saved'>('idle');
  let wordCount = $state(0);

  function countWords(html: string): number {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent || '').trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function emit(html: string) {
    wordCount = countWords(html);
    saveFlash = 'saving';
    onChange(html);
    setTimeout(() => (saveFlash = 'saved'), 600);
    setTimeout(() => {
      if (saveFlash === 'saved') saveFlash = 'idle';
    }, 2500);
  }

  function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function insertImageFromFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    uploading = true;
    try {
      const res = await api.upload<{ success: boolean; data: { url: string } }>('/upload', file);
      const url = (res as any)?.data?.url ?? (res as any)?.url;
      if (url && editor) editor.chain().focus().setImage({ src: url }).run();
      else throw new Error('no url');
    } catch {
      // Fallback lokal: embed sebagai data URI (S3 belum terkonfigurasi di dev).
      const dataUri = await fileToDataUri(file);
      if (editor) editor.chain().focus().setImage({ src: dataUri }).run();
    } finally {
      uploading = false;
    }
  }

  function onPaste(e: ClipboardEvent) {
    if (compact) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault();
        const f = it.getAsFile();
        if (f) insertImageFromFile(f);
        return;
      }
    }
  }

  function onDrop(e: DragEvent) {
    if (compact) return;
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith('image/')) {
      e.preventDefault();
      insertImageFromFile(f);
    }
  }

  function openMath() {
    mathOpen = true;
    queueMicrotask(() => mathField?.focus());
  }

  function insertMath() {
    if (!mathField || !editor) return;
    const latex = mathField.getValue();
    if (!latex) {
      mathOpen = false;
      return;
    }
    editor.chain().focus().insertContent({ type: 'math', attrs: { latex } }).run();
    mathOpen = false;
  }

  function insertGraph(src: string, alt: string) {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'graph', attrs: { src, alt } }).run();
  }

  function insertGeometry(src: string, alt: string, zoom = 1, offset = '0,0') {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'geometry', attrs: { src, alt, zoom, offset } }).run();
  }

  // Sisipkan atau perbarui node canvas geometri di posisi seleksi saat ini.
  function upsertGeometryCanvas(scene: GeoScene) {
    if (!editor) return;
    const src = sceneToDataUri(scene);
    const json = JSON.stringify(scene);
    const { state } = editor;
    const { from } = state.selection;
    let updated = false;
    const tr = state.tr;
    state.doc.nodesBetween(Math.max(0, from - 2), from + 2, (node, pos) => {
      if (node.type.name === 'geometryCanvas') {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, scene: json, src });
        updated = true;
        return false;
      }
    });
    if (updated) editor.view.dispatch(tr);
    else editor.chain().focus().insertContent({ type: 'geometryCanvas', attrs: { scene: json, src, alt: 'Canvas geometri' } }).run();
  }

  function openCanvasNew() {
    editingScene = undefined;
    canvasOpen = true;
  }
  function openCanvasEdit(sceneJson: string) {
    try {
      editingScene = JSON.parse(sceneJson) as GeoScene;
    } catch {
      editingScene = emptyScene();
    }
    canvasOpen = true;
  }

  function onCanvasEdit(e: Event) {
    const detail = (e as CustomEvent<{ scene: string }>).detail;
    if (detail?.scene) openCanvasEdit(detail.scene);
  }

  onMount(() => {
    editor = new Editor({
      element: el,
      editable: !disabled,
      extensions: [
        StarterKit,
        Image.configure({ inline: false, allowBase64: false }),
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        MathNode,
        GraphNode,
        GeometryNode,
        GeometryCanvasNode
      ],
      content: value,
      onUpdate: ({ editor }) => {
        tableActive = editor.isActive('table');
        emit(editor.getHTML());
      },
      onSelectionUpdate: ({ editor }) => {
        tableActive = editor.isActive('table');
      }
    });
    el.addEventListener('paste', onPaste);
    el.addEventListener('drop', onDrop);
    el.addEventListener('geometry-canvas-edit', onCanvasEdit);
  });

  onDestroy(() => {
    el?.removeEventListener('paste', onPaste);
    el?.removeEventListener('drop', onDrop);
    el?.removeEventListener('geometry-canvas-edit', onCanvasEdit);
    editor?.destroy();
  });

  const overMin = $derived(minWordCount != null && wordCount < minWordCount);
  const overMax = $derived(maxWordCount != null && wordCount > maxWordCount);
</script>

<div class="rich-editor rounded-xl border border-border bg-card">
  {#if !disabled}
    <div class="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
      <Button variant="ghost" size="icon" disabled={!editor?.can().chain().focus().toggleBold().run()} onclick={() => editor?.chain().focus().toggleBold().run()} title="Tebal">
        <Bold class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleItalic().run()} title="Miring">
        <Italic class="h-4 w-4" />
      </Button>
      {#if !compact}
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Judul">
        <Heading2 class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleBulletList().run()} title="List">
        <List class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleOrderedList().run()} title="List bernomor">
        <ListOrdered class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" type="button" disabled={uploading} title="Sisipkan gambar" onclick={() => imgInput?.click()}>
        {#if uploading}<Loader2 class="h-4 w-4 animate-spin" />{:else}<ImageIcon class="h-4 w-4" />{/if}
      </Button>
      <input
        bind:this={imgInput}
        class="hidden"
        type="file"
        accept="image/*"
        onchange={(e) => {
          const f = (e.currentTarget as HTMLInputElement).files?.[0];
          if (f) insertImageFromFile(f);
          (e.currentTarget as HTMLInputElement).value = '';
        }}
      />
      {/if}
      <Button variant="ghost" size="icon" onclick={openMath} title="Sisipkan rumus (MathLive)">
        <Sigma class="h-4 w-4" />
      </Button>
      {#if allowFigures}
      <Button variant="ghost" size="icon" onclick={() => (graphOpen = true)} title="Sisipkan grafik fungsi f(x)">
        <ChartLine class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => (geometryOpen = true)} title="Sisipkan bangun geometri 2D/3D">
        <Box class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => openCanvasNew()} title="Canvas bangun geometri (drag & drop, objek di dalam objek)">
        <Layers class="h-4 w-4" />
      </Button>
      {/if}
      {#if !compact}
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Sisipkan tabel 3×3">
        <Table2 class="h-4 w-4" />
      </Button>
      {/if}
      <span class="ml-auto text-xs text-muted-foreground tabular-nums">
        {#if !compact && showFlash && saveFlash === 'saving'}
          <span class="inline-flex items-center gap-1"><Loader2 class="h-3 w-3 animate-spin" /> Menyimpan draf…</span>
        {:else if !compact && showFlash && saveFlash === 'saved'}
          <span class="inline-flex items-center gap-1 text-emerald-600"><span>✓</span> Tersimpan di server</span>
        {/if}
        {#if !compact && (minWordCount != null || maxWordCount != null)}
          <span class={cn('ml-3', overMin && 'text-amber-600', overMax && 'text-rose-600')}>
            {wordCount} kata{minWordCount != null ? ` (min ${minWordCount})` : ''}{maxWordCount != null ? ` (max ${maxWordCount})` : ''}
          </span>
        {/if}
      </span>
    </div>
    {#if tableActive && !compact}
      <div class="flex flex-wrap items-center gap-1 border-b border-border bg-accent/40 px-2 py-1">
        <span class="mr-1 text-xs font-medium text-muted-foreground">Tabel:</span>
        <Button variant="ghost" size="sm" onclick={() => editor?.chain().focus().addRowAfter().run()} title="Tambah baris">+ Baris</Button>
        <Button variant="ghost" size="sm" onclick={() => editor?.chain().focus().addColumnAfter().run()} title="Tambah kolom">+ Kolom</Button>
        <Button variant="ghost" size="sm" class="text-rose-600" onclick={() => editor?.chain().focus().deleteTable().run()} title="Hapus tabel">Hapus</Button>
      </div>
    {/if}
  {/if}

  <div bind:this={el} class={compact ? 'min-h-[2.5rem] px-3 py-2 text-sm leading-relaxed' : 'px-4 py-3 text-[15px] leading-relaxed'}></div>

  {#if mathOpen}
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.target === e.currentTarget && (mathOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (mathOpen = false)}
    >
      <div class="w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl animate-fade-in">
        <h3 class="mb-3 text-sm font-semibold text-foreground">Editor Persamaan Matematika</h3>
        <math-field bind:this={mathField}></math-field>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="outline" onclick={() => (mathOpen = false)}>Batal</Button>
          <Button onclick={insertMath}>Sisipkan</Button>
        </div>
      </div>
    </div>
  {/if}

  <GraphDialog open={graphOpen} onClose={() => (graphOpen = false)} onInsert={insertGraph} />
  <GeometryDialog open={geometryOpen} onClose={() => (geometryOpen = false)} onInsert={insertGeometry} />
  <GeometryCanvasDialog open={canvasOpen} scene={editingScene} onClose={() => (canvasOpen = false)} onSave={upsertGeometryCanvas} />
</div>
