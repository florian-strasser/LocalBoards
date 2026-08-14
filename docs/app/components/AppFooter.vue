<template>
  <footer role="contentinfo" class="w-full pt-8 pb-7">
    <div class="container text-gray">
      <div class="px-8 sm:px-12 py-7 sm:py-10 bg-white rounded-3xl">
        <div class="flex w-full justify-between gap-x-6 flex-wrap">
          <div>
            Made with ♥ by
            <a
              href="https://github.com/florian-strasser"
              target="_blank"
              class="text-gray hover:text-primary"
              >Florian Strasser</a
            >
          </div>
          <ul class="flex gap-x-3">
            <li>
              <NuxtLink class="hover:text-primary" to="/privacy-policy"
                >Privacy policy</NuxtLink
              >
            </li>
            <li>
              <NuxtLink class="hover:text-primary" to="/site-notice"
                >Site notice</NuxtLink
              >
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
