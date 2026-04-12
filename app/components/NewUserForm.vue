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
                            <Zap class="size-6" />
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
import { Zap } from "lucide-vue-next";

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
    try {
        const response = await $fetch("/api/auth/admin/create", {
            method: "POST",
            body: {
                name: name.value,
                email: email.value,
                password: password.value,
                role: role.value,
            },
        });

        if (response.success) {
            createdUser.value = true;
            await nuxtApp.callHook("app:toast", {
                message: $t("userCreated"),
            });
        } else {
            throw new Error(response.error || "Failed to create user");
        }
    } catch (e) {
        let errorMessage = "Failed to create user";
        if (e?.data?.error) {
            errorMessage = e.data.error;
        } else if (e?.message) {
            errorMessage = e.message;
        }

        await nuxtApp.callHook("app:toast", {
            message: errorMessage,
        });
    }
};
</script>
