<template>
    <div>
        <ContentBox>
            <form
                v-if="!savedUser"
                @submit.prevent="handleSaveUser"
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

                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    value="Save user information"
                />
            </form>
            <div v-else class="space-y-5">
                <p>
                    Here you can copy all data from the edited user to save or
                    send it to the person who uses this account:
                </p>
                <p>
                    Username: {{ username }}<br />
                    Email: {{ email }}
                </p>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const props = defineProps({
    id: String,
    email: String,
    username: String,
});

const username = ref(props.username);
const email = ref(props.email);
const errorMessage = ref("");

const savedUser = ref(false);

const handleSaveUser = async () => {
    try {
        const { data: updatedUser, error } = await authClient.admin.updateUser({
            userId: props.id,
            data: {
                email: email.value,
                username: username.value,
            },
        });
        if (error) {
            throw new Error("Email or Username is already taken");
        }
        savedUser.value = true;
    } catch (err) {
        errorMessage.value =
            err.message || "An error occurred while updating the user";
    }
};
</script>
