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
                                Login
                            </NuxtLink>
                        </div>
                        <div
                            class="text-center block py-3 px-5 bg-white rounded-t-lg"
                        >
                            Sign up
                        </div>
                    </div>
                    <div class="bg-white rounded-lg rounded-tr-none p-5">
                        <form
                            @submit.prevent="handleSignUp"
                            class="relative space-y-4"
                        >
                            <InputField
                                type="text"
                                label="Name"
                                required
                                v-model="name"
                            />
                            <InputField
                                type="email"
                                label="E-Mail"
                                required
                                v-model="email"
                            />
                            <InputField
                                type="password"
                                label="Password"
                                required
                                v-model="password"
                            />
                            <InputCheckbox
                                label="I have read and accept the <a class='text-secondary' href='https://www.florian-strasser.de/datenschutz/'>Privacy Policy</a>."
                                required
                                v-model="privacy"
                            />
                            <input
                                type="submit"
                                class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-secondary text-white"
                                value="Sign up"
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
    title: "Signup",
});
const schema = z.object({
    name: z.string("Name required"),
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
                        message: "Successfully registered",
                    });
                    await navigateTo("/dashboard/");
                },
                onError: async (ctx) => {
                    await nuxtApp.callHook("app:toast", {
                        message: ctx.error.message,
                    });
                },
            },
        );
    } catch (e) {
        // Handle validation errors
        if (e instanceof z.ZodError) {
            const errors = await JSON.parse(e);
            await nuxtApp.callHook("app:toast", {
                message: errors[0].message,
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
