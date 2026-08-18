<script lang="ts">
  import { page } from '$app/stores';
  import ProjectorView from '$components/ProjectorView.svelte';
</script>

<svelte:head><title>Proyektor — CBT LMS</title></svelte:head>
<ProjectorView scheduleId={$page.params.id ?? ''} />
