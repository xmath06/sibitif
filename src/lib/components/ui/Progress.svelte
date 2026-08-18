<script lang="ts">
  import { cn } from '$lib/utils';

  let {
    value = 0,
    max = 100,
    class: className = ''
  }: {
    value?: number;
    max?: number;
    class?: string;
  } = $props();

  const pct = $derived(Math.min(100, Math.max(0, (value / (max || 1)) * 100)));
</script>

<div class={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
  <div
    class="h-full rounded-full bg-primary transition-all duration-500 ease-out"
    style="width: {pct}%"
  ></div>
</div>
