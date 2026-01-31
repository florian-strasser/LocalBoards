<template>
  <header class="w-full py-6">
    <div class="container mx-auto flex justify-between items-center">
      <NuxtLink
        to="/"
        class="text-primary hover:text-secondary cursor-pointer block"
      >
        <Logo />
      </NuxtLink>
      <ul class="flex gap-x-4 items-center">
        <li><NuxtLink class="hover:text-secondary" to="/">About</NuxtLink></li>
        <li>
          <NuxtLink class="hover:text-secondary" to="/docs">Docs</NuxtLink>
        </li>
        <li><NuxtLink class="hover:text-secondary" to="/api">API</NuxtLink></li>
        <li>
          <a
            href="https://github.com/florian-strasser/LocalBoards/releases"
            target="_blank"
            class="block py-2 px-4 rounded-full bg-secondary text-white"
            >Download</a
          >
        </li>
      </ul>
    </div>
  </header>
</template>
