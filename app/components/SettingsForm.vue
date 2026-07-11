<template>
    <form
        @submit.prevent="handleSettings"
        class="relative space-y-4 bg-white dark:bg-slate rounded-xl p-5"
    >
        <!-- Picker on the left with the name/role beside it on wider screens;
             stacks vertically on narrow/mobile viewports so the name and role
             don't get squeezed. -->
        <div class="flex flex-col gap-4 md:flex-row">
            <div class="w-92 max-w-full shrink-0 grow-0">
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
            </div>
            <div class="shrink grow space-y-3">
                <InputField type="text" label="Name" required v-model="name" />
                <div>
                    <label class="mb-1 block text-sm/6 font-medium text-gray">{{
                        $t("role")
                    }}</label>
                    <!-- Admins can demote themselves to a normal user; everyone
                         else just sees their role read-only. -->
                    <SegmentedControl
                        v-if="isAdmin"
                        :values="[
                            { value: 'user', label: $t('user') },
                            { value: 'admin', label: $t('admin') },
                        ]"
                        name="role"
                        v-model="role"
                    />
                    <p v-else class="text-sm/6 text-dark dark:text-white">
                        {{ role === "admin" ? $t("admin") : $t("user") }}
                    </p>
                </div>
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

// Only admins may change their own role (to demote themselves). Others see it
// read-only. The backend enforces this and blocks demoting the last admin.
const isAdmin = session.value?.data?.user?.role === "admin";
const originalRole = session.value?.data?.user?.role || "user";
const role = ref(originalRole);

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
                role: role.value,
            },
        });

        if (response.success) {
            // A role change affects the whole session (header admin links, what
            // the user may do). Reload so the refreshed session is picked up
            // everywhere instead of lagging until the next navigation.
            if (role.value !== originalRole) {
                window.location.reload();
                return;
            }
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
            // Surface the server's error code (e.g. LAST_ADMIN when an admin
            // tries to demote themselves while being the only admin).
            await nuxtApp.callHook("app:toast", {
                message:
                    e?.data?.error || e?.message || $t("error_UPDATING_USER"),
            });
        }
    }
};
</script>
