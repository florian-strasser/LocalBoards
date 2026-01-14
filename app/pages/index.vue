<template>
    <div class="relative min-h-screen flex flex-col">
        <main class="flex flex-col justify-center py-8 grow shrink-0">
            <div class="container mx-auto">
                <div class="max-w-md mx-auto">
                    <div class="grid grid-cols-2 text-sm">
                        <div
                            class="text-center block py-3 px-5 bg-white rounded-t-lg"
                        >
                            {{ $t("login") }}
                        </div>
                        <div class="bg-white">
                            <NuxtLink
                                to="/sign-up/"
                                class="text-primary hover:text-secondary text-center block py-3 px-5 rounded-bl-lg bg-slate"
                            >
                                {{ $t("signUp") }}
                            </NuxtLink>
                        </div>
                    </div>
                    <div class="bg-white rounded-lg rounded-tl-none p-5">
                        <form
                            @submit.prevent="handleLogin"
                            class="relative space-y-4"
                        >
                            <InputField
                                type="email"
                                :label="$t('email')"
                                required
                                v-model="email"
                            />
                            <InputField
                                type="password"
                                :label="$t('password')"
                                required
                                v-model="password"
                            />
                            <input
                                type="submit"
                                class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-secondary text-white"
                                :value="$t('loginBtn')"
                            />
                        </form>
                    </div>
                    <div class="text-center mt-4 text-sm">
                        <NuxtLink
                            class="text-primary hover:text-secondary"
                            to="/lost-password/"
                        >
                            {{ $t("lostPasswordQuestion") }}
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import * as z from "zod";
const nuxtApp = useNuxtApp();

useHead({
    title: $t("login"),
});

const schema = z.object({
    email: z.email("Invalid e-mail address"),
    password: z.string("Password required"),
});

const email = ref("");
const password = ref("");

type Schema = z.output<typeof schema>;

const handleLogin = async () => {
    const formData = { email: email.value, password: password.value };

    try {
        // Validate the form data
        schema.parse(formData);

        const { data, error } = await authClient.signIn.email(
            {
                email: email.value, // required
                password: password.value, // required
                rememberMe: true,
                callbackURL: "/dashboard/",
            },
            {
                onSuccess: async (ctx) => {
                    await navigateTo("/dashboard/");
                },
                onError: async (ctx) => {
                    const response = await JSON.parse(ctx.responseText);
                    await nuxtApp.callHook("app:toast", {
                        message: $t("error_" + response.code),
                    });
                },
            },
        );
    } catch (e) {
        // Handle validation errors
        if (e instanceof z.ZodError) {
            const errors = await JSON.parse(e);
            console.log(errors[0]);
            await nuxtApp.callHook("app:toast", {
                message: $t("error_" + errors[0].code),
            });
            // You can display these errors to the user
        } else {
            console.log(e);
            await nuxtApp.callHook("app:toast", {
                message: e,
            });
        }
    }
};
</script>
