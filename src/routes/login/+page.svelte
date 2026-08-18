<script lang="ts">
  import { goto } from '$app/navigation';
  import { login } from '$lib/stores/session';
  import { afterLogin } from '$lib/routing';
  import Button from '$components/ui/Button.svelte';
  import Card from '$components/ui/Card.svelte';
  import { GraduationCap, Loader2 } from 'lucide-svelte';
  import { ApiError } from '$api/client';

  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = '';
    try {
      const u = await login(username, password);
      // console.log('user', u);
      goto(afterLogin(u.role));
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Login gagal';
      loading = false;
    }
  }
</script>

<div class="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 to-indigo-50 px-4">
  <Card class="w-full max-w-sm p-7">
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <GraduationCap class="h-7 w-7" />
      </div>
      <h1 class="text-xl font-bold text-foreground">CBT &amp; LMS</h1>
      <p class="text-sm text-muted-foreground">Masuk untuk mulai belajar &amp; ujian</p>
    </div>

    {#if error}
      <p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
    {/if}

    <form onsubmit={submit} class="space-y-4">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Username</span>
        <input bind:value={username} autocomplete="username" required class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Password</span>
        <input type="password" bind:value={password} autocomplete="current-password" required class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <Button type="submit" class="w-full" disabled={loading}>
        {#if loading}<Loader2 class="h-4 w-4 animate-spin" />{/if} Masuk
      </Button>
    </form>
  </Card>
</div>
