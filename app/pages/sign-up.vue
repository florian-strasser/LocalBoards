<template>
    <div class="relative min-h-screen flex flex-col">
        <main class="flex flex-col justify-center py-8 grow shrink-0">
            <div class="container mx-auto">
                <div class="max-w-md mx-auto">
                    <div class="grid grid-cols-2 text-sm">
                        <div class="bg-white">
                            <NuxtLink
                                to="/"
                                class="text-primary hover:text-secondary text-center block py-3 px-5 rounded-br-lg bg-slate"
                            >
                                {{ $t("login") }}
                            </NuxtLink>
                        </div>
                        <div
                            class="text-center block py-3 px-5 bg-white rounded-t-lg"
                        >
                            {{ $t("signUp") }}
                        </div>
                    </div>
                    <div class="bg-white rounded-lg rounded-tr-none p-5">
                        <form
                            @submit.prevent="handleSignUp"
                            class="relative space-y-4"
                        >
                            <InputField
                                type="text"
                                :label="$t('name')"
                                required
                                v-model="name"
                            />
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
                            <InputCheckbox
                                :label="
                                    $t('signUpHintBefore') +
                                    ' <a class=\'text-secondary\' href=\'' +
                                    privacyURL +
                                    '\'>' +
                                    $t('privacyPolicy') +
                                    '</a> ' +
                                    $t('signUpHintAfter')
                                "
                                required
                                v-model="privacy"
                            />
                            <input
                                type="submit"
                                class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-secondary text-white"
                                :value="$t('signUpBtn')"
                            />
                        </form>
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
    title: $t("signUp"),
});

const privacyURL = nuxtApp.$config.public.privacyUrl;
console.log(privacyURL);

const schema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .refine((val) => val.trim().length > 0, {
            message: "Name cannot be only blank spaces",
        }),
    email: z.email("Invalid e-mail address"),
    password: z
        .string("Password required")
        .min(8, "Password must be at least 8 characters long"),
    privacy: z.boolean("Privacy Policy must be accepted"),
});

const name = ref("");
const email = ref("");
const password = ref("");
const privacy = ref(false);

type Schema = z.output<typeof schema>;

const handleSignUp = async () => {
    const formData = {
        name: name.value,
        email: email.value,
        password: password.value,
        privacy: privacy.value,
    };

    try {
        // Validate the form data
        schema.parse(formData);
        const { data, error } = await authClient.signUp.email(
            {
                name: name.value, // required
                email: email.value, // required
                password: password.value, // required
                callbackURL: "/dashboard/",
                rememberMe: true,
            },
            {
                onSuccess: async (ctx) => {
                    await nuxtApp.callHook("app:toast", {
                        message: $t("successfullySignedUp"),
                    });
                    await navigateTo("/dashboard/");
                },
                onError: async (ctx) => {
                    await nuxtApp.callHook("app:toast", {
                        message: $t("error_" + ctx.error.code),
                    });
                },
            },
        );
    } catch (e) {
        // Handle validation errors
        if (e instanceof z.ZodError) {
            const errors = await JSON.parse(e);
            await nuxtApp.callHook("app:toast", {
                message: $t("error_" + errors[0].code),
            });
            // You can display these errors to the user
        } else {
            await nuxtApp.callHook("app:toast", {
                message: e,
            });
        }
    }
};
</script>
