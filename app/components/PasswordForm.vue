<template>
    <form
        @submit.prevent="handlePassword"
        class="relative space-y-4 bg-white dark:bg-slate rounded-xl p-5"
    >
        <InputField
            type="password"
            :label="$t('settingsOldPassword')"
            required
            v-model="oldPassword"
        />
        <InputField
            type="password"
            :label="$t('settingsNewPassword')"
            required
            v-model="newPassword"
        />
        <input
            type="submit"
            class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-secondary text-white"
            :value="$t('settingsSaveNewPassword')"
        />
    </form>
</template>
<script setup lang="ts">
import * as z from "zod";

const nuxtApp = useNuxtApp();

const oldPassword = ref("");
const newPassword = ref("");

const schema = z.object({
    oldPassword: z.string("Old Password required"),
    newPassword: z
        .string("New Password required")
        .min(8, "Password must be at least 8 characters long"),
});

const handlePassword = async () => {
    const formData = {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value,
    };
    try {
        // Validate the form data
        schema.parse(formData);

        // Update password using our custom endpoint
        const response = await $fetch("/api/auth/update-password", {
            method: "POST",
            body: {
                oldPassword: oldPassword.value,
                newPassword: newPassword.value,
                revokeOtherSessions: true,
            },
        });
        if (response.success) {
            await nuxtApp.callHook("app:toast", {
                message: $t("savedPassword"),
            });
        } else {
            throw new Error(response.error || "Failed to update password");
        }
    } catch (e) {
        // Handle validation errors
        if (e instanceof z.ZodError) {
            const errors = await JSON.parse(e);
            await nuxtApp.callHook("app:toast", {
                message: $t("error_" + errors[0].code),
            });
            // You can display these errors to the user
        } else {
            // Handle fetch errors
            let errorMessage = "Failed to update password";
            if (e?.data?.error) {
                // Extract error message from response data
                errorMessage = e.data.error;
            } else if (e?.message) {
                errorMessage = e.message;
            }
            await nuxtApp.callHook("app:toast", {
                message: $t("error_" + errorMessage),
            });
        }
    }
};
</script>
