<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initSession, user, sessionLoading, logout } from '$lib/stores/session';
  import { goto } from '$app/navigation';
  import { homeForRole } from '$lib/routing';
  import Button from '$components/ui/Button.svelte';
  import { LogOut, GraduationCap, Menu, X } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  onMount(() => initSession());

  const isAuthPage = $derived($page.url.pathname === '/login');

  const path = $derived($page.url.pathname);
  // Sorot menu sesuai route yang sedang aktif.
  function navCls(href: string) {
    return path === href || path.startsWith(href + '/')
      ? 'text-sm font-medium text-primary hover:underline'
      : 'text-sm font-medium text-muted-foreground hover:text-foreground';
  }

  const navItems = $derived.by(() => {
    const r = $user?.role;
    if (!r) return [];
    if (r === 'STUDENT') {
      return [
        { href: '/student/dashboard', label: 'Daftar Ujian' },
        { href: '/account/change-password', label: 'Ganti Password' }
      ];
    }
    const items = [
      { href: '/teacher/dashboard', label: 'Dashboard' },
      { href: '/teacher/subjects', label: 'Bank Soal' },
      { href: '/teacher/packages', label: 'Paket' },
      { href: '/teacher/schedules', label: 'Jadwal' },
      { href: '/teacher/students', label: 'Siswa' }
    ];
    if (r === 'ADMIN') {
      items.push({ href: '/admin/users', label: 'User' });
      items.push({ href: '/admin/classes', label: 'Kelas' });
    }
    items.push({ href: '/docs', label: 'Dokumentasi' });
    return items;
  });

  let mobileOpen = $state(false);
</script>

{#if isAuthPage}
  {@render children()}
{:else if $sessionLoading}
  <div class="grid min-h-screen place-items-center text-muted-foreground">Memuat sesi…</div>
{:else}
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <a href={$user ? homeForRole($user.role) : '/login'} class="flex shrink-0 items-center gap-2">
          <GraduationCap class="h-6 w-6 text-primary" />
          <span class="font-bold text-foreground">CBT<span class="text-primary">LMS</span></span>
        </a>
        {#if $user}
          <span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{$user.role}</span>
          <nav class="ml-2 hidden items-center gap-3 md:flex">
            {#each navItems as n (n.href)}
              <a href={n.href} class={navCls(n.href)}>{n.label}</a>
            {/each}
          </nav>
        {/if}
        <div class="ml-auto flex items-center gap-2">
          {#if $user}
            <a href="/account/change-password" class="hidden text-sm text-muted-foreground hover:text-foreground sm:inline" title="Ganti password">{$user.name}</a>
            <Button variant="ghost" size="sm" onclick={async () => { await logout(); goto('/login'); }}>
              <LogOut class="h-4 w-4" /> <span class="hidden sm:inline">Keluar</span>
            </Button>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground md:hidden"
              onclick={() => (mobileOpen = !mobileOpen)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {#if mobileOpen}<X class="h-5 w-5" />{:else}<Menu class="h-5 w-5" />{/if}
            </button>
          {/if}
        </div>
      </div>
      {#if mobileOpen && $user}
        <nav class="border-t border-border bg-card px-3 py-2 md:hidden">
          {#each navItems as n (n.href)}
            <a
              href={n.href}
              class={path === n.href || path.startsWith(n.href + '/')
                ? 'block rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-primary'
                : 'block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground'}
              onclick={() => (mobileOpen = false)}
            >{n.label}</a>
          {/each}
        </nav>
      {/if}
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      {@render children()}
    </main>
  </div>
{/if}
