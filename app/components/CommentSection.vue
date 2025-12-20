<template>
    <div>
        <CardEditor v-model="commentContent" />
        <div>Hier kommen die Kommentare hin</div>
    </div>
</template>
<script setup lang="ts">
const props = defineProps({
    cardID: Number,
});
const commentContent = ref("");
</script>
