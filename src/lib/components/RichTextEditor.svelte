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
  import { ImageIcon, Loader2, Sigma, Bold, Italic, List, ListOrdered, Heading2, Table2 } from 'lucide-svelte';
  import { api } from '$api/client';
  import Button from '$components/ui/Button.svelte';
  import { cn } from '$lib/utils';

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

  let {
    value = '',
    placeholder = 'Tulis jawaban atau soal di sini…',
    disabled = false,
    onChange = (_html: string) => {},
    minWordCount = null,
    maxWordCount = null
  }: {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    onChange?: (html: string) => void;
    minWordCount?: number | null;
    maxWordCount?: number | null;
  } = $props();

  let el: HTMLDivElement;
  let editor = $state<Editor | null>(null);
  let uploading = $state(false);
  let mathOpen = $state(false);
  let mathField = $state<any>(null);
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

  function insertImageFromFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    uploading = true;
    api
      .upload<{ success: boolean; data: { url: string } }>('/upload', file)
      .then((res) => {
        const url = (res as any).data?.url;
        if (url && editor) editor.chain().focus().setImage({ src: url }).run();
      })
      .catch(() => alert('Gagal mengunggah gambar'))
      .finally(() => (uploading = false));
  }

  function onPaste(e: ClipboardEvent) {
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
        MathNode
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
  });

  onDestroy(() => {
    el?.removeEventListener('paste', onPaste);
    el?.removeEventListener('drop', onDrop);
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
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Judul">
        <Heading2 class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleBulletList().run()} title="List">
        <List class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().toggleOrderedList().run()} title="List bernomor">
        <ListOrdered class="h-4 w-4" />
      </Button>
      <label class="cursor-pointer">
        <Button variant="ghost" size="icon" type="button" disabled={uploading} title="Sisipkan gambar">
          {#if uploading}<Loader2 class="h-4 w-4 animate-spin" />{:else}<ImageIcon class="h-4 w-4" />{/if}
        </Button>
        <input
          class="hidden"
          type="file"
          accept="image/*"
          onchange={(e) => {
            const f = (e.currentTarget as HTMLInputElement).files?.[0];
            if (f) insertImageFromFile(f);
            (e.currentTarget as HTMLInputElement).value = '';
          }}
        />
      </label>
      <Button variant="ghost" size="icon" onclick={openMath} title="Sisipkan rumus (MathLive)">
        <Sigma class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onclick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Sisipkan tabel 3×3">
        <Table2 class="h-4 w-4" />
      </Button>
      <span class="ml-auto text-xs text-muted-foreground tabular-nums">
        {#if saveFlash === 'saving'}
          <span class="inline-flex items-center gap-1"><Loader2 class="h-3 w-3 animate-spin" /> Menyimpan draf…</span>
        {:else if saveFlash === 'saved'}
          <span class="inline-flex items-center gap-1 text-emerald-600"><span>✓</span> Tersimpan di server</span>
        {/if}
        {#if minWordCount != null || maxWordCount != null}
          <span class={cn('ml-3', overMin && 'text-amber-600', overMax && 'text-rose-600')}>
            {wordCount} kata{minWordCount != null ? ` (min ${minWordCount})` : ''}{maxWordCount != null ? ` (max ${maxWordCount})` : ''}
          </span>
        {/if}
      </span>
    </div>
    {#if tableActive}
      <div class="flex flex-wrap items-center gap-1 border-b border-border bg-accent/40 px-2 py-1">
        <span class="mr-1 text-xs font-medium text-muted-foreground">Tabel:</span>
        <Button variant="ghost" size="sm" onclick={() => editor?.chain().focus().addRowAfter().run()} title="Tambah baris">+ Baris</Button>
        <Button variant="ghost" size="sm" onclick={() => editor?.chain().focus().addColumnAfter().run()} title="Tambah kolom">+ Kolom</Button>
        <Button variant="ghost" size="sm" class="text-rose-600" onclick={() => editor?.chain().focus().deleteTable().run()} title="Hapus tabel">Hapus</Button>
      </div>
    {/if}
  {/if}

  <div bind:this={el} class="px-4 py-3 text-[15px] leading-relaxed"></div>

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
</div>
