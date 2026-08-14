<template>
  <section>
    <div class="container">
      <div
        class="flex flex-col-reverse lg:grid lg:grid-cols-2 bg-white rounded-3xl"
      >
        <div class="px-8 sm:px-12 py-7 sm:py-10">
          <p class="text-primary sm:text-lg">Creator of LokalBoards</p>
          <h2 class="text-dark text-4xl sm:text-5xl mb-4">
            Florian Strasser
          </h2>
          <p class="sm:text-lg mb-4">
            I'm an independant webdesigner & webdeveloper from germany. Since i
            don't like to store my personal or customer data on US Servers, i
            needed a smart alternative for KanBan Boards. Therefore i created
            LokalBoards and shared it with the world.
          </p>

          <p class="sm:text-lg mb-5">
            Since i already use this project in production with real life
            customers, there will be plenty of updates over the time.
          </p>
          <a
            href="https://www.florian-strasser.de"
            class="inline-block bg-primary hover:bg-primary-hover text-white px-5 sm:px-6 py-2 sm:py-3 sm:text-lg rounded-full"
            target="_blank"
            >Visit my website</a
          >
        </div>
        <div
          class="relative aspect-4/3 lg:aspect-auto bg-primary rounded-3xl overflow-clip"
        >
          <img
            class="absolute top-0 left-0 w-full h-full object-cover"
            src="/images/creator_florian_strasser.webp"
            alt="Florian Strasser"
          />
        </div>
      </div>
    </div>
  </section>
</template>
