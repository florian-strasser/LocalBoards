<template>
  <div class="space-y-16">
    <PageHero />
    <PageFeatures />
    <PageCreator />
  </div>
</template>
<script setup lang="ts">
useSeoMeta({
  title: "Self-hosted Kanban boards for teams",
  description:
    "LocalBoards is an open-source (MIT License), self-hosted Kanban board system. It allows users to create boards, invite collaborators, and manage Kanban cards.",
});
</script>
