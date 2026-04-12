<template>
    <div>
        <ContentBox>
            <form
                v-if="!savedUser"
                @submit.prevent="handleSaveUser"
                class="space-y-6"
            >
                <div class="form-group">
                    <InputField
                        type="text"
                        :label="$t('name')"
                        name="name"
                        :required="true"
                        v-model="name"
                    />
                </div>

                <div class="form-group">
                    <InputField
                        type="email"
                        :label="$t('email')"
                        name="email"
                        :required="true"
                        v-model="email"
                    />
                </div>

                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    :value="$t('saveUserInformation')"
                />
            </form>
            <div v-else class="space-y-5">
                <p>
                    {{ $t("saveUserMessage") }}
                </p>
                <p>
                    {{ $t("name") }}: {{ name }}<br />
                    {{ $t("email") }}: {{ email }}
                </p>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
const nuxtApp = useNuxtApp();

const props = defineProps({
    id: String,
});

// Get user data using our custom endpoint
const { data: userData } = await useFetch("/api/auth/admin/list");

// Find the specific user by ID
const currentUser = computed(() => {
    return userData.value?.users?.find((user) => user.id === props.id);
});

const name = ref(currentUser.value?.username || "");
const email = ref(currentUser.value?.email || "");

const savedUser = ref(false);

const handleSaveUser = async () => {
    try {
        const response = await $fetch("/api/auth/admin/update", {
            method: "POST",
            body: {
                userId: props.id,
                name: name.value,
                email: email.value,
            },
        });

        if (response.success) {
            savedUser.value = true;
        } else {
            throw new Error(response.error || "Failed to update user");
        }
    } catch (err) {
        let errorMessage = "Failed to update user";
        if (err?.data?.error) {
            errorMessage = err.data.error;
        } else if (err?.message) {
            errorMessage = err.message;
        }

        await nuxtApp.callHook("app:toast", {
            message: errorMessage || $t("error_UPDATING_USER"),
        });
    }
};
</script>
