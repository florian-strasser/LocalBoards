<template>
    <div
        class="min-h-screen flex flex-col justify-center items-center max-w-md w-full mx-auto"
    >
        <div class="container">
            <form
                v-if="!passwordChanged"
                @submit.prevent="handleReset"
                class="space-y-6 w-full px-8 pb-8 pt-7 bg-white rounded-xl border border-gray/10 relative z-10"
            >
                <ErrorMessage v-if="errorMessage">{{
                    errorMessage
                }}</ErrorMessage>
                <div class="form-group">
                    <InputField
                        type="password"
                        label="Password"
                        name="password"
                        required
                        v-model="password"
                    />
                </div>
                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    value="Recover password"
                />
            </form>
            <div v-else class="px-8 pb-8 pt-7 bg-white rounded-xl text-center">
                <h2 class="text-4xl text-primary mb-6">
                    Password changed successfully
                </h2>
                <NuxtLink
                    to="/"
                    class="bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
                    >Back to login</NuxtLink
                >
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const route = useRoute();
const token = route.params.token;

const password = ref("");
const passwordChanged = ref(false);

const errorMessage = ref("");

const handleReset = async () => {
    const { data, error } = await authClient.resetPassword(
        {
            newPassword: password.value, // required
            token, // required
        },
        {
            onSuccess: async (ctx) => {
                passwordChanged.value = true;
            },
            onError: (ctx) => {
                errorMessage.value = ctx.error.message;
            },
        },
    );
};
</script>
