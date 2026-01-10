<template>
    <div>
        <ContentBox>
            <form
                v-if="!createdUser"
                @submit.prevent="handleNewUser"
                class="space-y-6"
            >
                <div class="form-group">
                    <InputField
                        type="text"
                        name="name"
                        :label="$t('name')"
                        :required="true"
                        v-model="name"
                    />
                </div>

                <div class="form-group">
                    <InputField
                        type="email"
                        name="email"
                        :label="$t('email')"
                        :required="true"
                        v-model="email"
                    />
                </div>

                <div class="form-group">
                    <div class="flex gap-x-4 items-end">
                        <InputField
                            type="text"
                            :label="$t('password')"
                            name="password"
                            :required="true"
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

                <div class="form-group">
                    <label class="block text-sm/6 font-medium text-gray">{{
                        $t("role")
                    }}</label>
                    <RadioList
                        :values="[
                            { value: 'user', label: $t('user') },
                            { value: 'admin', label: $t('admin') },
                        ]"
                        name="role"
                        v-model="role"
                    />
                </div>

                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    :value="$t('createAccount')"
                />
            </form>
            <div v-else class="space-y-5">
                <p>
                    {{ $t("accountCreatedMessage") }}
                </p>
                <p>
                    {{ $t("email") }}: {{ email }}<br />
                    {{ $t("password") }}: {{ password }}
                </p>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import { BoltIcon } from "@heroicons/vue/24/solid";

const nuxtApp = useNuxtApp();

const generateRandomPassword = () => {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const name = ref("");
const email = ref("");
const password = ref(generateRandomPassword());
const role = ref("user");

const createdUser = ref(false);

const handleNewUser = async () => {
    await authClient.admin.createUser(
        {
            email: email.value,
            password: password.value,
            name: name.value,
            role: role.value,
        },
        {
            onSuccess: async (ctx) => {
                createdUser.value = true;
                await nuxtApp.callHook("app:toast", {
                    message: $t("userCreated"),
                });
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
