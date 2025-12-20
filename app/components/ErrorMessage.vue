<template>
    <div
        class="bg-secondary/10 border border-secondary text-secondary px-6 py-5 rounded-lg"
    >
        <div class="flex">
            <ExclamationCircleIcon class="size-8 shrink-0 grow-0" />
            <div class="shrink grow pt-1 ml-2">
                <slot />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ExclamationCircleIcon } from "@heroicons/vue/24/solid";
</script>
