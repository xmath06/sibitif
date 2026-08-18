<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/session';
  import { marked } from 'marked';
  import teacherMd from '$lib/docs/teacher.md?raw';
  import adminMd from '$lib/docs/admin.md?raw';

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }: any) {
    const text = (tokens as { text?: string }[]).map((t) => t.text ?? '').join('');
    const slug = slugify(text);
    return `<h${depth} id="${slug}">${text}</h${depth}>`;
  };
  marked.use({ renderer });

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function extractToc(md: string) {
    const toc: { level: number; slug: string; text: string }[] = [];
    for (const line of md.split('\n')) {
      const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
      if (m) {
        const text = m[2].replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
        toc.push({ level: m[1].length, slug: slugify(text), text });
      }
    }
    return toc;
  }

  const isAdmin = $derived($user?.role === 'ADMIN');
  const md = $derived(isAdmin ? `${teacherMd}\n\n---\n\n${adminMd}` : teacherMd);
  const toc = $derived(extractToc(md));
  const html = $derived(wrapSections(marked.parse(md, { async: false }) as string));

  // Bungkus tiap section (h1/h2 + isinya) ke dalam band berwarna lembut.
  function wrapSections(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.body;
    let current: HTMLElement | null = null;
    let band = 0;
    for (const el of Array.from(root.childNodes)) {
      if (el.nodeType === 3 || el.nodeName === 'HR') {
        el.remove();
        continue;
      }
      if (el.nodeType === 1 && /^H[12]$/.test((el as HTMLElement).tagName)) {
        const section = doc.createElement('section');
        section.className = `docs-band band-${band % 4}`;
        band++;
        section.appendChild(el);
        root.appendChild(section);
        current = section;
      } else if (current) {
        current.appendChild(el);
      } else {
        root.appendChild(el);
      }
    }
    return root.innerHTML;
  }

  $effect(() => {
    if ($user && $user.role === 'STUDENT') goto('/student/dashboard');
  });

  function jump(slug: string) {
    document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="mb-6">
  <h1 class="text-xl font-bold text-foreground">Dokumentasi</h1>
  <p class="text-sm text-muted-foreground">Alur sistem &amp; panduan pemakaian. Pilih bagian pada daftar isi untuk melompat langsung ke langkah tertentu.</p>
</div>

{#snippet tocLinks()}
  <ul class="space-y-1 text-sm">
    {#each toc as item (item.slug)}
      <li class={item.level === 1 ? 'font-semibold text-foreground' : item.level === 2 ? 'pl-3 text-muted-foreground' : 'pl-6 text-muted-foreground'}>
        <a href="#{item.slug}" class="hover:text-primary" onclick={(e) => { e.preventDefault(); jump(item.slug); }}>{item.text}</a>
      </li>
    {/each}
  </ul>
{/snippet}

<details class="mb-4 rounded-lg border border-border bg-card p-3 md:hidden">
  <summary class="cursor-pointer text-sm font-medium text-foreground">Daftar Isi</summary>
  <div class="mt-2">{@render tocLinks()}</div>
</details>

<div class="grid gap-8 md:grid-cols-[240px_1fr]">
  <aside class="hidden md:block">
    <nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto border-l border-border pl-4">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Daftar Isi</p>
      {@render tocLinks()}
    </nav>
  </aside>
  <article class="docs-content min-w-0">
    {@html html}
  </article>
</div>