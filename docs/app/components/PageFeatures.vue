<template>
  <section>
    <div class="container">
      <p class="text-secondary sm:text-lg">What you can do</p>
      <h2 class="text-primary text-4xl sm:text-5xl mb-4">Features</h2>
      <div
        class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-4 px-8 sm:px-12 py-7 sm:py-10 bg-white rounded-3xl"
      >
        <div
          class="flex gap-x-2"
          v-for="feature in features"
          :class="{ 'opacity-75': feature.soon }"
        >
          <CircleCheck
            class="text-secondary size-7 sm:size-8 shrink-0 grow-0"
            :stroke-width="1.5"
          />
          <p class="text-primary sm:text-lg grow shrink pt-0.75">
            {{ feature.title }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { CircleCheck } from "lucide-vue-next";
const features = [
  { title: "Create and manage boards" },
  { title: "Invite others to your board" },
  { title: "Different layouts for boards" },
  { title: "Realtime updates across the app" },
  { title: "Choose your language" },
  { title: "Supports dark mode" },
  { title: "WCAG Compliant colors" },
  { title: "Open source and free forever" },
  { title: "Runs on your own hardware" },
  { title: "Does not rely on external services" },
  { title: "Automate processes with our API" },
  { title: "Use our integrated MCP Server", soon: true },
];
</script>
