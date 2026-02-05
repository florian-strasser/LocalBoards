<template>
  <header class="w-full py-6" role="banner">
    <div class="container mx-auto flex justify-between items-center">
      <NuxtLink
        to="/"
        aria-label="LocalBoards"
        class="text-primary hover:text-secondary cursor-pointer block"
      >
        <Logo />
      </NuxtLink>
      <nav role="navigation">
        <ul class="flex gap-x-4 items-center">
          <li>
            <NuxtLink class="hover:text-secondary" to="/">About</NuxtLink>
          </li>
          <li>
            <NuxtLink class="hover:text-secondary" to="/docs">Docs</NuxtLink>
          </li>
          <li>
            <NuxtLink class="hover:text-secondary" to="/api">API</NuxtLink>
          </li>
          <li>
            <a
              href="https://github.com/florian-strasser/LocalBoards/releases"
              target="_blank"
              class="block py-2 px-4 rounded-full bg-secondary text-white"
              >Download</a
            >
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>
