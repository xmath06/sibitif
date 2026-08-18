<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initSession, user, sessionLoading, logout } from '$lib/stores/session';
  import { goto } from '$app/navigation';
  import Button from '$components/ui/Button.svelte';
  import { LogOut, GraduationCap } from 'lucide-svelte';
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
</script>

{#if isAuthPage}
  {@render children()}
{:else if $sessionLoading}
  <div class="grid min-h-screen place-items-center text-muted-foreground">Memuat sesi…</div>
{:else}
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <GraduationCap class="h-6 w-6 text-primary" />
        <span class="font-bold text-foreground">CBT<span class="text-primary">LMS</span></span>
        {#if $user}
          <span class="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{$user.role}</span>
          {#if $user.role !== 'STUDENT'}
            <nav class="ml-4 hidden items-center gap-3 md:flex">
              <a href="/teacher/subjects" class={navCls('/teacher/subjects')}>Bank Soal</a>
              <a href="/teacher/packages" class={navCls('/teacher/packages')}>Paket</a>
              <a href="/teacher/schedules" class={navCls('/teacher/schedules')}>Jadwal</a>
              {#if $user.role === 'ADMIN'}<a href="/admin/users" class={navCls('/admin/users')}>User</a>{/if}
              {#if $user.role === 'ADMIN'}<a href="/admin/classes" class={navCls('/admin/classes')}>Kelas</a>{/if}
              {#if $user.role === 'ADMIN' || $user.role === 'TEACHER'}<a href="/teacher/students" class={navCls('/teacher/students')}>Siswa</a>{/if}
            </nav>
          {/if}
        {/if}
          <div class="ml-auto flex items-center gap-3">
           {#if $user}
             <a href="/account/change-password" class="text-sm text-muted-foreground hover:text-foreground" title="Ganti password">{$user.name}</a>
               <Button variant="ghost" size="sm" onclick={async () => { await logout(); goto('/login'); }}>
               <LogOut class="h-4 w-4" /> Keluar
             </Button>
           {/if}
         </div>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      {@render children()}
    </main>
  </div>
{/if}
