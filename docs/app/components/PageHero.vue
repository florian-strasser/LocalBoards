<template>
  <section>
    <div class="container">
      <div class="">
        <div class="max-w-2xl mx-auto text-center">
          <p class="text-secondary sm:text-lg">
            Self-hosted Kanban boards for teams
          </p>
          <h1 class="text-primary text-4xl sm:text-5xl mb-4">
            Collaborate in teams or with customers on your own server
          </h1>
          <p class="sm:text-lg mb-5">
            LokalBoards is an open-source (MIT License), self-hosted Kanban
            board system. It allows users to create boards, invite
            collaborators, and manage Kanban cards.
          </p>
          <NuxtLink
            to="/docs/"
            class="inline-block bg-secondary text-white px-5 sm:px-6 py-2 sm:py-3 sm:text-lg rounded-full"
            >Get started</NuxtLink
          >
        </div>
        <div
          class="aspect aspect-16/9 relative rounded-3xl overflow-clip mt-10"
        >
          <img
            src="/images/lokalboards-screen.webp"
            alt="A user that is using LokalBoards in production"
            class="absolute top-0 left-0 w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </section>
</template>
