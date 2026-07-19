<template>
    <div
        class="min-h-svh flex flex-col justify-center items-center max-w-lg w-full mx-auto"
    >
        <div class="container">
            <form
                v-if="!passwordChanged"
                @submit.prevent="handleReset"
                class="space-y-6 w-full px-8 pb-8 pt-7 bg-white dark:bg-slate rounded-xl relative z-10"
            >
                <ErrorMessage v-if="errorMessage">{{
                    errorMessage
                }}</ErrorMessage>
                <div class="form-group">
                    <InputField
                        type="password"
                        :label="$t('password')"
                        name="password"
                        required
                        v-model="password"
                    />
                </div>
                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    :value="$t('changePassword')"
                />
            </form>
            <div
                v-else
                class="px-8 pb-8 pt-7 bg-white dark:bg-slate rounded-xl text-center"
            >
                <h2 class="text-4xl text-dark dark:text-white mb-6">
                    {{ $t("passwordChangedSuccessfully") }}
                </h2>
                <NuxtLink
                    to="/"
                    class="bg-primary dark:text-gray hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
                    >{{ $t("backToLogin") }}</NuxtLink
                >
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
const route = useRoute();
const token = route.params.token;

const password = ref("");
const passwordChanged = ref(false);

const errorMessage = ref("");

const handleReset = async () => {
    try {
        const response = await $fetch("/api/auth/reset-password", {
            method: "POST",
            body: {
                token: token,
                newPassword: password.value,
            },
        });
        if (response.success) {
            passwordChanged.value = true;
        } else {
            throw new Error(response.error || "Failed to reset password");
        }
    } catch (err) {
        let eMessage = "Failed to reset password";
        if (err?.data?.error) {
            eMessage = err.data.error;
        } else if (err?.message) {
            eMessage = err.message;
        }
        errorMessage.value = eMessage;
    }
};
</script>
