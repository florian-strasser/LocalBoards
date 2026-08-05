<template>
    <!-- Rendered as real nodes rather than v-html: the text comes from card and
         comment content, so building a markup string here would be an injection
         waiting to happen. -->
    <template v-for="(part, index) in parts" :key="index"
        ><mark
            v-if="part.match"
            class="bg-transparent font-semibold text-primary"
            >{{ part.text }}</mark
        ><template v-else>{{ part.text }}</template></template
    >
</template>

<script setup lang="ts">
const props = defineProps({
    text: { type: String, default: "" },
    term: { type: String, default: "" },
});

const parts = computed(() => {
    const text = props.text ?? "";
    const term = (props.term ?? "").trim();
    if (!term) return [{ text, match: false }];

    const out: { text: string; match: boolean }[] = [];
    const haystack = text.toLowerCase();
    const needle = term.toLowerCase();
    let from = 0;
    let at = haystack.indexOf(needle);
    while (at !== -1) {
        if (at > from) out.push({ text: text.slice(from, at), match: false });
        out.push({ text: text.slice(at, at + needle.length), match: true });
        from = at + needle.length;
        at = haystack.indexOf(needle, from);
    }
    if (from < text.length) out.push({ text: text.slice(from), match: false });
    return out;
});
</script>
