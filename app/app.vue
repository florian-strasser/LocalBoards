<template>
    <div class="app-wrapper">
        <NuxtRouteAnnouncer />
        <NuxtPage />
        <ToastHolder />
        <OnboardingOverlay />
        <PageScrollbar />
    </div>
</template>
<script setup lang="ts">
const nuxtApp = useNuxtApp();
const config = nuxtApp.$config.public;

// The app name lives in the (server-only) runtimeConfig so it can be set via
// NUXT_APP_NAME at runtime. useState carries the resolved value to the client
// so the title is correct both during SSR and on client-side navigation.
const appName = useState(
    "appName",
    () => useRuntimeConfig().appName || "LocalBoards",
);

// Same runtime story as the app name: the language comes from NUXT_LANGUAGE and
// is shared with the i18n plugin via the "language" state key.
const language = useState(
    "language",
    () => useRuntimeConfig().language || "en",
);

useHead({
    htmlAttrs: {
        lang: language.value,
    },
    // Only define the template. Pages set their own title chunk (e.g. a board
    // name) which becomes "<chunk> | <appName>"; pages without a title fall
    // back to just "<appName>". No static title is set here or in the config,
    // otherwise it would be wrapped into "<appName> | <appName>".
    titleTemplate: (titleChunk) =>
        titleChunk ? `${titleChunk} | ${appName.value}` : appName.value,
    style: [
        {
            innerHTML: `
              :root {
                --color-primary: ${config.colorPrimary};
                --color-secondary: ${config.colorSecondary};
                --color-white: ${config.colorWhite};
                --color-gray: ${config.colorGray};
                --color-slate: ${config.colorSlate};
                --color-black: ${config.colorBlack};
                --color-dark: ${config.colorDark};
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --color-primary: ${config.colorPrimaryDark};
                  --color-secondary: ${config.colorSecondaryDark};
                  --color-gray: ${config.colorGrayDark};
                  --color-slate: ${config.colorSlateDark};
                  --color-dark: ${config.colorDarkDark};
                }
              }
            `,
            type: "text/css",
        },
    ],
});
</script>
