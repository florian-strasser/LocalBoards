<template>
  <div class="code-example my-6">
    <!-- One tab per language this example actually provides. An endpoint with
         no PHP snippet simply has no PHP tab rather than an empty one. -->
    <div
      class="code-example__tabs flex flex-wrap gap-1 rounded-t-xl px-2 pt-2 pb-0"
      role="tablist"
    >
      <button
        v-for="option in available"
        :key="option.id"
        type="button"
        role="tab"
        :aria-selected="language === option.id"
        class="cursor-pointer rounded-t-lg px-3.5 py-2 text-sm transition-colors"
        :class="
          language === option.id
            ? 'code-example__tab--active text-dark'
            : 'text-gray hover:text-primary'
        "
        @click="language = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Every snippet is rendered and hidden rather than swapped in, so the
         highlighting is done once at build time and switching costs nothing. -->
    <div class="code-example__body">
      <div v-show="language === option.id" v-for="option in available" :key="option.id">
        <slot :name="option.id" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const slots = useSlots();
const language = useCodeLanguage();

const available = computed(() =>
  CODE_LANGUAGES.filter((option) => slots[option.id]),
);

// A reader whose remembered language is one this example does not offer sees
// the first one it does, rather than an empty panel.
watchEffect(() => {
  if (available.value.length && !available.value.some((o) => o.id === language.value)) {
    language.value = available.value[0]!.id;
  }
});
</script>
