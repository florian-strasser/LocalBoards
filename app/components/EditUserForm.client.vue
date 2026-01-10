<template>
    <div>
        <ContentBox>
            <form
                v-if="!savedUser"
                @submit.prevent="handleSaveUser"
                class="space-y-6"
            >
                <div class="form-group">
                    <InputField
                        type="text"
                        :label="$t('name')"
                        name="name"
                        :required="true"
                        v-model="name"
                    />
                </div>

                <div class="form-group">
                    <InputField
                        type="email"
                        :label="$t('email')"
                        name="email"
                        :required="true"
                        v-model="email"
                    />
                </div>

                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    :value="$t('saveUserInformation')"
                />
            </form>
            <div v-else class="space-y-5">
                <p>
                    {{ $t("saveUserMessage") }}
                </p>
                <p>
                    {{ $t("name") }}: {{ name }}<br />
                    {{ $t("email") }}: {{ email }}
                </p>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const nuxtApp = useNuxtApp();

const props = defineProps({
    id: String,
});

const { data: userData, error } = await authClient.admin.listUsers({
    query: {
        limit: 1,
        filterField: "id",
        filterValue: props.id,
        filterOperator: "eq",
    },
});

const name = ref(userData.users[0].name);
const email = ref(userData.users[0].email);

const savedUser = ref(false);

const handleSaveUser = async () => {
    try {
        const { data: updatedUser, error } = await authClient.admin.updateUser({
            userId: props.id,
            data: {
                email: email.value,
                name: name.value,
            },
        });
        if (error) {
            throw new Error($t("error_EMAIL_TAKEN"));
        }
        savedUser.value = true;
    } catch (err) {
        await nuxtApp.callHook("app:toast", {
            message: err.message || $t("error_UPDATING_USER"),
        });
    }
};
</script>
