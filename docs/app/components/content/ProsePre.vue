<template>
  <div class="prose-pre">
    <pre :class="$props.class"><slot /></pre>
    <!-- `code` is the raw source Nuxt Content parsed, before highlighting, so
         copying gets the code and none of the markup wrapped around it. -->
    <button
      type="button"
      class="prose-pre__copy"
      :class="{ 'prose-pre__copy--done': done }"
      :title="label"
      :aria-label="label"
      @click="copy"
    >
      <svg
        v-if="!done"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  code: { type: String, default: "" },
  language: { type: String, default: null },
  filename: { type: String, default: null },
  highlights: { type: Array as () => number[], default: () => [] },
  meta: { type: String, default: null },
  class: { type: String, default: null },
});

const done = ref(false);
const label = computed(() => (done.value ? "Copied" : "Copy to clipboard"));
let timer: ReturnType<typeof setTimeout> | null = null;

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.code.replace(/\n$/, ""));
    done.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (done.value = false), 1600);
  } catch {
    /* a browser that refuses the clipboard leaves the code selectable */
  }
};

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>
