<template>
    <div v-if="createdKey">
        <h2 class="text-4xl text-primary mb-3">
            {{ $t("createdKeyHeadline") }}
        </h2>
        <div class="relative mb-3">
            <input
                type="text"
                :value="createdKey"
                class="pl-4 pr-10 py-2 block w-full outline-0 border-2 border-gray/30 focus:border-primary rounded-lg"
            />
            <div class="absolute top-1 right-1 w-9">
                <button
                    type="button"
                    class="size-9 flex justify-center items-center bg-primary hover:bg-secondary rounded-lg text-white"
                    @click="handleCopy"
                    v-tooltip="$t('createdKeyCopyTip')"
                >
                    <Clipboard class="size-5" />
                </button>
            </div>
        </div>
        <p class="text-sm">{{ $t("createdKeyCopyMessage") }}</p>
    </div>
    <form
        v-else
        @submit.prevent="handleNewKey"
        class="relative space-y-4 text-left"
    >
        <InputField
            type="text"
            :label="$t('settingsKeyName')"
            required
            v-model="name"
        />
        <div>
            <label class="block text-sm/6 font-medium text-gray">{{
                $t("settingsKeyExpires")
            }}</label>
            <RadioList
                :values="[
                    { value: 30, label: $t('settingsKeyExpiresIn30Days') },
                    { value: 90, label: $t('settingsKeyExpiresIn90Days') },
                    { value: 180, label: $t('settingsKeyExpiresIn180Days') },
                    { value: 365, label: $t('settingsKeyExpiresIn365Days') },
                ]"
                name="status"
                v-model="expiresIn"
            />
        </div>
        <input
            type="submit"
            class="block w-full rounded-lg px-4 py-2 bg-primary hover:bg-secondary text-white"
            :value="$t('settingsSaveNewKey')"
        />
    </form>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import { Clipboard } from "lucide-vue-next";

const nuxtApp = useNuxtApp();

const createdKey = ref(false);
const name = ref("");
const expiresIn = ref(30);

const emits = defineEmits(["key-created"]);

const handleNewKey = async () => {
    try {
        const { data, error } = await authClient.apiKey.create({
            name: name.value || $t("settingsKeyNameUnknown"),
            expiresIn: 60 * 60 * 24 * expiresIn.value,
        });
        if (error) {
            await nuxtApp.callHook("app:toast", {
                message: $t("error_" + error.code),
            });
        } else {
            createdKey.value = data.key;
            emits("key-created", data);
            await nuxtApp.callHook("app:toast", {
                message: $t("savedKey"),
            });
        }
    } catch (e) {
        await nuxtApp.callHook("app:toast", {
            message: e,
        });
    }
};
const handleCopy = async () => {
    try {
        await navigator.clipboard.writeText(createdKey.value);
        await nuxtApp.callHook("app:toast", {
            message: $t("keyCopied"),
        });
    } catch (error) {
        await nuxtApp.callHook("app:toast", {
            message: $t("error_copyFailed"),
        });
    }
};
</script>
