<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader>{{ $t("settingsYourAccount") }}</SectionHeader>
            <SettingsForm />
            <h2 class="text-5xl text-primary mt-12 mb-5">
                {{ $t("settingsChangePassword") }}
            </h2>
            <PasswordForm />
        </ContentWrapper>
        <AppFooter />
    </div>
</template>
