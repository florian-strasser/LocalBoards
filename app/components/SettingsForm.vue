<template>
    <form
        @submit.prevent="handleSettings"
        class="relative space-y-4 bg-white dark:bg-slate rounded-xl p-5"
    >
        <div class="flex flex-col md:flex-row gap-y-4 gap-x-5">
            <InputImage
                :label="$t('settingsProfilePicture')"
                :images="[
                    '/images/profile_placeholder_01.png',
                    '/images/profile_placeholder_02.png',
                    '/images/profile_placeholder_03.png',
                    '/images/profile_placeholder_04.png',
                    '/images/profile_placeholder_05.png',
                    '/images/profile_placeholder_06.png',
                ]"
                v-model="image"
            />
            <div class="grow shrink">
                <InputField type="text" label="Name" required v-model="name" />
            </div>
        </div>
        <input
            type="submit"
            class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-secondary text-white"
            :value="$t('settingsSaveChanges')"
        />
    </form>
</template>
<script setup lang="ts">
import * as z from "zod";

const nuxtApp = useNuxtApp();
const { data: session } = await useFetch("/api/auth/get-session");

const name = ref(session.value?.data?.user?.name || "");
const image = ref(session.value?.data?.user?.image || undefined);

const schema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .refine((val) => val.trim().length > 0, {
            message: "Name cannot be only blank spaces",
        }),
});

const handleSettings = async () => {
    const formData = { name: name.value };
    try {
        // Validate the form data
        schema.parse(formData);

        // Update data using our custom endpoint
        const response = await $fetch("/api/auth/update-user", {
            method: "POST",
            body: {
                name: name.value,
                image: image.value,
            },
        });

        if (response.success) {
            await nuxtApp.callHook("app:toast", {
                message: $t("settingsSavedUserData"),
            });
        } else {
            throw new Error(response.error || "Failed to update user");
        }
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
                message: e.message || "Failed to update user settings",
            });
        }
    }
};
</script>
