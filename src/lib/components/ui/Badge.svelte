<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  type Tone = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'muted';

  let {
    tone = 'default',
    class: className = '',
    children
  }: {
    tone?: Tone;
    class?: string;
    children: Snippet;
  } = $props();

  const tones: Record<Tone, string> = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    primary: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    muted: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
  };
</script>

<span
  class={cn(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
    tones[tone],
    className
  )}
>
  {@render children()}
</span>
