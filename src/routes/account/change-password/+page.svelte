<script lang="ts">
  import { api, ApiError } from '$api/client';
  import Card from '$components/ui/Card.svelte';
  import Button from '$components/ui/Button.svelte';
  import { Loader2, KeyRound, ArrowLeft } from 'lucide-svelte';

  let current = $state('');
  let next = $state('');
  let confirm = $state('');
  let saving = $state(false);
  let error = $state('');
  let ok = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = ''; ok = false;
    if (next.length < 6) { error = 'Password baru minimal 6 karakter'; return; }
    if (next !== confirm) { error = 'Konfirmasi password tidak cocok'; return; }
    saving = true;
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      ok = true; current = next = confirm = '';
    } catch (err) { error = err instanceof ApiError ? err.message : 'Gagal mengubah password'; }
    finally { saving = false; }
  }
</script>

<div class="mx-auto max-w-md">
  <Button variant="ghost" size="sm" class="mb-3" onclick={() => (location.href = '/')}><ArrowLeft class="h-4 w-4" /> Kembali</Button>
  <Card class="p-7">
    <div class="mb-5 flex items-center gap-2">
      <div class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><KeyRound class="h-5 w-5" /></div>
      <h1 class="text-lg font-bold text-foreground">Ganti Password</h1>
    </div>

    {#if ok}<p class="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password berhasil diubah.</p>{/if}
    {#if error}<p class="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>{/if}

    <form onsubmit={submit} class="space-y-4">
      <label class="block"><span class="mb-1 block text-sm font-medium">Password Saat Ini</span>
        <input type="password" bind:value={current} autocomplete="current-password" required class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">Password Baru</span>
        <input type="password" bind:value={next} autocomplete="new-password" required class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">Konfirmasi Password Baru</span>
        <input type="password" bind:value={confirm} autocomplete="new-password" required class="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
      <Button type="submit" class="w-full" disabled={saving}>{#if saving}<Loader2 class="h-4 w-4 animate-spin" />{/if} Simpan</Button>
    </form>
  </Card>
</div>
