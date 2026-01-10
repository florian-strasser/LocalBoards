<template>
    <div>
        <ContentBox>
            <form
                v-if="!changedPassword"
                @submit.prevent="handleSavePassword"
                class="space-y-6"
            >
                <div class="form-group">
                    <div class="flex items-end gap-x-4">
                        <InputField
                            type="text"
                            :label="$t('newPassword')"
                            name="password"
                            required
                            v-model="password"
                        />
                        <button
                            type="button"
                            class="bg-primary text-white hover:bg-secondary px-4 h-11 rounded-lg"
                            v-tooltip="$t('generatePassword')"
                            @click="password = generateRandomPassword()"
                        >
                            <BoltIcon class="size-6" />
                        </button>
                    </div>
                </div>

                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    :value="$t('changePassword')"
                />
            </form>
            <div v-else class="space-y-5">
                <p>
                    {{ $t("newPasswordMessage") }}
                </p>
                <p>{{ $t("password") }}: {{ password }}</p>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import { BoltIcon } from "@heroicons/vue/24/solid";

const nuxtApp = useNuxtApp();

const props = defineProps({
    id: String,
});

const generateRandomPassword = () => {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const password = ref("");

const changedPassword = ref(false);

const handleSavePassword = async () => {
    const userId = props.id;
    const { data: newUser, error } = await authClient.admin.setUserPassword(
        {
            newPassword: password.value,
            userId: userId,
        },
        {
            onSuccess: async (ctx) => {
                changedPassword.value = true;
            },
            onError: async (ctx) => {
                await nuxtApp.callHook("app:toast", {
                    message: $t("error_" + ctx.error.code),
                });
            },
        },
    );
};
</script>
