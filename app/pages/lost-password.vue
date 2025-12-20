<template>
    <div class="min-h-screen flex flex-col justify-center items-center w-full">
        <div class="container">
            <form
                v-if="!requestNew"
                @submit.prevent="handleReset"
                class="max-w-md mx-auto space-y-6 w-full px-8 pb-8 pt-7 bg-white rounded-xl border border-gray/10 mb-5 relative z-10"
            >
                <ErrorMessage v-if="errorMessage">{{
                    errorMessage
                }}</ErrorMessage>
                <div class="form-group">
                    <InputField
                        type="email"
                        label="E-Mail"
                        name="email"
                        required
                        v-model="email"
                    />
                </div>
                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    value="Recover password"
                />
            </form>
            <div
                v-else
                class="max-w-md mx-auto px-8 pb-8 pt-7 bg-white rounded-xl text-center"
            >
                <h2 class="text-4xl text-primary mb-6">
                    Requested new password, check your inbox
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
const nuxtApp = useNuxtApp();
const email = ref("");

const requestNew = ref(false);
const errorMessage = ref("");

const handleReset = async () => {
    const { data, error } = await authClient.requestPasswordReset({
        email: email.value, // required
        redirectTo: "http://localhost:3000/reset-password",
    });
    requestNew.value = true;
};
</script>
