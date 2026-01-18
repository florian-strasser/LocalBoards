<template>
    <div class="mt-12">
        <SectionHeader
            asH2
            :tooltip="$t('createNewKey')"
            asButton
            @sectionHeaderButtonClicked="createKey = true"
            >{{ $t("settingsApiKeys") }}</SectionHeader
        >
        <div v-if="keyList?.length > 0" class="space-y-1">
            <ApiItem
                v-for="key in keyList"
                :id="key.id"
                :name="key.name"
                :start="key.start"
                :expires="new Date(key.expiresAt)"
                @key-deleted="handleKeyDeleted"
            />
        </div>
        <div v-else class="bg-white rounded-xl p-5">
            {{ $t("settingsKeyListEmpty") }}
        </div>
        <ModalWindow v-model="createKey">
            <ApiForm @key-created="handleKeyCreated" />
        </ModalWindow>
    </div>
</template>
<script setup lang="ts">
const keyList = ref([]);
const createKey = ref(false);

const { data, error } = await useFetch("/api/auth/api-key/list");
keyList.value = data.value;

const handleKeyDeleted = async (id) => {
    const keyToDelete = keyList.value.find((key) => key.id === id);

    if (keyToDelete) {
        keyList.value = keyList.value.filter((key) => key.id !== id);
    } else {
        console.error("Key not found with ID:", id);
    }
    await nextTick(); // Wait for the DOM to update
};

const handleKeyCreated = (item) => {
    keyList.value.push(item);
};
</script>
