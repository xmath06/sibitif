<script lang="ts">
  import { cn } from '$lib/utils';
  import { Flag } from 'lucide-svelte';

  type QState = { id: string; index: number; answered: boolean; flagged: boolean };

  let {
    questions,
    currentId,
    collapsed = false,
    onselect
  }: {
    questions: QState[];
    currentId: string;
    collapsed?: boolean;
    onselect: (id: string) => void;
  } = $props();

  const answeredCount = $derived(questions.filter((q) => q.answered).length);
</script>

<aside
  class={cn(
    'flex h-full flex-col border-r border-border bg-card transition-all duration-300',
    collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-56 shrink-0 p-3 opacity-100'
  )}
>
  <div class="mb-3 flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navigasi</span>
    <span class="text-xs font-medium text-primary tabular-nums">{answeredCount}/{questions.length}</span>
  </div>
  <div class="grid grid-cols-5 gap-2 overflow-y-auto pr-1">
    {#each questions as q (q.id)}
      <button
        onclick={() => onselect(q.id)}
        class={cn(
          'relative grid h-9 w-9 place-items-center rounded-lg border text-sm font-semibold transition-colors',
          q.id === currentId
            ? 'border-primary bg-primary text-primary-foreground'
            : q.answered
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-border bg-secondary text-secondary-foreground hover:bg-accent'
        )}
        title={`Soal ${q.index + 1}`}
      >
        {q.index + 1}
        {#if q.flagged}
          <Flag class="absolute -right-1 -top-1 h-3 w-3 fill-amber-500 text-amber-500" />
        {/if}
      </button>
    {/each}
  </div>
  <div class="mt-4 space-y-1.5 text-xs text-muted-foreground">
    <div class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-primary bg-primary"></span> Sedang dibuka</div>
    <div class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-emerald-200 bg-emerald-50"></span> Terjawab</div>
    <div class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-border bg-secondary"></span> Kosong</div>
  </div>
</aside>
