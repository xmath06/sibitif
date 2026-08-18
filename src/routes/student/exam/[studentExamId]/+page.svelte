<script lang="ts">
  import { page } from '$app/stores';
  import ExamSheet from '$components/ExamSheet.svelte';
</script>

<ExamSheet studentExamId={$page.params.studentExamId ?? ''} />
