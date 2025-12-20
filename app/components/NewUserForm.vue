<template>
    <div>
        <ContentBox>
            <form
                v-if="!createdUser"
                @submit.prevent="handleNewUser"
                class="space-y-6"
            >
                <ErrorMessage v-if="errorMessage">{{
                    errorMessage
                }}</ErrorMessage>
                <div class="form-group">
                    <label
                        for="username"
                        class="block text-sm/6 font-medium text-gray"
                        >Username</label
                    >
                    <InputField
                        type="text"
                        name="username"
                        :required="true"
                        v-model="username"
                    />
                </div>

                <div class="form-group">
                    <label
                        for="email"
                        class="block text-sm/6 font-medium text-gray"
                        >Email</label
                    >
                    <InputField
                        type="email"
                        name="email"
                        :required="true"
                        v-model="email"
                    />
                </div>

                <div class="form-group">
                    <label
                        for="password"
                        class="block text-sm/6 font-medium text-gray"
                        >Password</label
                    >
                    <div class="flex gap-x-4">
                        <InputField
                            type="text"
                            name="password"
                            :required="true"
                            v-model="password"
                        />
                        <button
                            type="button"
                            class="bg-primary text-white hover:bg-secondary px-4 rounded-lg"
                            @click="password = generateRandomPassword()"
                        >
                            <BoltIcon class="size-6" />
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label class="block text-sm/6 font-medium text-gray"
                        >Role</label
                    >
                    <RadioList
                        :values="['user', 'admin']"
                        name="role"
                        v-model="role"
                    />
                </div>

                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    value="Create Account"
                />
            </form>
            <div v-else class="space-y-5">
                <p>
                    Here you can copy all data from the created user to save or
                    send it to the person who uses this account:
                </p>
                <p>
                    Username: {{ username }}<br />
                    Email: {{ email }}<br />
                    Password: {{ password }}
                </p>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import { BoltIcon } from "@heroicons/vue/24/solid";

const generateRandomPassword = () => {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const username = ref("");
const email = ref("");
const password = ref(generateRandomPassword());
const role = ref("user");
const errorMessage = ref("");

const createdUser = ref(false);

const handleNewUser = async () => {
    const { data: response, error } = await authClient.isUsernameAvailable(
        {
            username: username.value, // required
        },
        {
            onSuccess: async (ctx) => {
                if (ctx.data.available) {
                    const { data: newUser, error } =
                        await authClient.admin.createUser(
                            {
                                email: email.value,
                                password: password.value,
                                name: username.value,
                                role: role.value,
                                data: { username: username.value },
                            },
                            {
                                onSuccess: async (ctx) => {
                                    createdUser.value = true;
                                },
                                onError: (ctx) => {
                                    errorMessage.value = ctx.error.message;
                                },
                            },
                        );
                } else {
                    errorMessage.value = "Username is already taken";
                }
            },
            onError: (ctx) => {
                errorMessage.value = ctx.error.message;
            },
        },
    );
};
</script>
