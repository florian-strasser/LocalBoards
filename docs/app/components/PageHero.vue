<template>
  <section>
    <div class="container">
      <div class="">
        <!-- Wider than the 2xl this used to be. Inter sets wider than the
             system stack it replaced, so at the same sizes the headline and the
             blurb each picked up a third line; the measure has to grow with the
             face to keep both at two. -->
        <div class="max-w-4xl mx-auto text-center">
          <p class="text-primary sm:text-lg">
            Self-hosted Kanban boards for teams
          </p>
          <!-- `text-balance` evens the two lines out instead of letting the
               greedy wrap fill the first one and leave a stub on the second.
               It breaks after "with", which is where the sentence actually
               divides. A hard <br> would do the same at one width and be wrong
               at every other. -->
          <h1 class="text-dark text-4xl sm:text-5xl mb-4 text-balance">
            Collaborate in teams or with customers on your own server
          </h1>
          <!-- Balanced for the same reason as the headline, and to the same
               effect: left to the greedy wrap this ran 837px then 533px, wider
               than the headline above it and visibly lopsided. Balancing lands
               both lines at ~690px, which is the headline's own width — so the
               two blocks share an edge without either being given a hand-tuned
               max-width that would drift the moment the copy changes. -->
          <p class="sm:text-lg mb-5 text-balance">
            LokalBoards is an open-source (MIT License), self-hosted Kanban
            board system. It allows users to create boards, invite
            collaborators, and manage Kanban cards.
          </p>
          <NuxtLink
            to="/docs/"
            class="inline-block bg-primary hover:bg-primary-hover text-white px-5 sm:px-6 py-2 sm:py-3 sm:text-lg rounded-full"
            >Get started</NuxtLink
          >
        </div>
        <!-- The app itself, captured by `npm run demo:screenshots` — the same
             file the README shows. It replaces a stock photo of a laptop with a
             screen composited into it: that picture aged the moment the UI
             changed, and it showed a desk rather than the product. This one is
             regenerated from the running app on every demo run, so it cannot go
             stale. Not cropped: `object-contain` on the app's own background
             keeps the whole board visible at any width, where `object-cover`
             would slice the edges off. -->
        <div class="mt-10 rounded-3xl overflow-clip bg-slate">
          <img
            src="/images/readme-screenshot.webp"
            alt="A LokalBoards board with cards, checklists and comments"
            width="1440"
            height="900"
            class="block w-full h-auto"
          />
        </div>
      </div>
    </div>
  </section>
</template>
