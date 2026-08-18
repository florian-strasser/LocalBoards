<template>
    <div class="relative min-h-svh flex flex-col">
        <main class="flex flex-col justify-center py-8 grow shrink-0">
            <div class="container mx-auto">
                <div class="max-w-lg mx-auto">
                    <div class="grid grid-cols-2 text-sm">
                        <div class="bg-white dark:bg-slate">
                            <NuxtLink
                                to="/"
                                class="text-primary dark:text-white hover:text-primary-hover text-center block py-3 px-5 rounded-br-lg bg-slate dark:bg-dark"
                            >
                                {{ $t("login") }}
                            </NuxtLink>
                        </div>
                        <div
                            class="text-center block py-3 px-5 bg-white dark:bg-slate dark:text-white rounded-t-lg"
                        >
                            {{ $t("signUp") }}
                        </div>
                    </div>
                    <div
                        class="bg-white dark:bg-slate rounded-lg rounded-tr-none p-5"
                    >
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
                                :readonly="!!invite"
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
                                    ' <a class=\'text-primary hover:text-primary-hover\' href=\'' +
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
                                class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-primary-hover text-white"
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
import * as z from "zod";

const nuxtApp = useNuxtApp();

useHead({
    title: $t("signUp"),
});

const privacyURL = nuxtApp.$config.public.privacyUrl;

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

// An invitation link carries a token. The address it was issued to is fetched
// and shown so the person can see who the invitation is for, and the field is
// read-only because the server pins the address to the token anyway — editing it
// here would only produce a confusing error.
const route = useRoute();
const invite = ref(null);

onMounted(async () => {
    const token = String(route.query.invite || "");
    if (!token) return;

    try {
        const found = await $fetch("/api/auth/invitation", {
            query: { token },
        });
        if (found?.email) {
            invite.value = found;
            email.value = found.email;
        }
    } catch {
        // An expired, spent or unknown link just leaves the ordinary form —
        // which will then be refused unless the instance takes public signups.
        await nuxtApp.callHook("app:toast", {
            message: $t("invitationInvalid"),
        });
    }
});

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
        const { data, error } = await $fetch(`/api/auth/sign-up`, {
            method: "POST",
            body: {
                name: name.value, // required
                email: email.value, // required
                password: password.value, // required
                inviteToken: route.query.invite || undefined,
                callbackURL: "/dashboard/",
            },
        });
        if (data.callbackURL) {
            navigateTo(data.callbackURL);
        }
    } catch (e) {
        // Handle validation errors
        if (e instanceof z.ZodError) {
            const errors = await JSON.parse(e);
            await nuxtApp.callHook("app:toast", {
                message: $t("error_" + errors[0].code),
            });
            // You can display these errors to the user
        } else if (e?.data?.error === "DISABLED_SIGNUP") {
            // Now that the server answers 403, `$fetch` throws instead of
            // returning the body, so this is the branch that runs.
            await nuxtApp.callHook("app:toast", {
                message: $t("signupDisabled"),
            });
        } else {
            await nuxtApp.callHook("app:toast", {
                message: e,
            });
        }
    }
};
</script>
