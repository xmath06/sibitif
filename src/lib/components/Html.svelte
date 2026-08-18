<script lang="ts">
  import { renderMath } from '$lib/math';

  let {
    html = '',
    tag = 'div',
    class: cls = ''
  }: {
    html?: string;
    tag?: string;
    class?: string;
  } = $props();
</script>

<svelte:element this={tag} use:renderMath={html} class={cls ? `html-content ${cls}` : 'html-content'}></svelte:element>
