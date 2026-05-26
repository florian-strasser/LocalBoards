<template>
    <div class="app-wrapper">
        <NuxtRouteAnnouncer />
        <NuxtPage />
        <ToastHolder />
    </div>
</template>
<script setup lang="ts">
const nuxtApp = useNuxtApp();
const config = nuxtApp.$config.public;
useHead({
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
