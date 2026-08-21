<template>
  <section id="pricing" class="section">
    <div class="container">
      <!-- The eyebrow answers the question, and the heading only names the
           section the question was asked about. A visitor scanning for a price
           gets the whole answer before they reach the heading. -->
      <SplitText
        as="p"
        text="Free and open source"
        :stagger="0.02"
        class="text-primary sm:text-lg text-center"
      />
      <SplitText
        as="h2"
        text="Pricing"
        :delay="0.2"
        class="text-dark mb-8 text-3xl xs:text-4xl sm:text-5xl text-center"
      />

      <!-- One block, no comparison. There used to be two cards and a list of
           lines under each — but with nothing to compare against, most of those
           lines were chores dressed as features. "You apply the updates" and
           "You run the backups" are what self-hosting means, not something on
           offer; as bullet points they read like an argument for a plan that no
           longer exists. What is left is the part a reader came for: the price,
           the licence, and where to start. -->
      <FadeIn
        class="bg-slate mx-auto max-w-2xl rounded-3xl p-8 text-center sm:p-12"
        :amount="0.15"
      >
        <p class="text-dark text-6xl font-semibold tracking-tight sm:text-7xl">
          0 €
        </p>
        <p class="text-gray mt-2">Forever, for any number of people</p>

        <p class="text-dark mt-6">
          LokalBoards is open source under the MIT licence. There is no paid
          tier, no seat limit and no edition held back — a team of five and a
          team of five hundred install the same build. What it costs you is the
          server it runs on.
        </p>

        <div
          class="mt-8 flex flex-col justify-center gap-3 xs:flex-row"
        >
          <NuxtLink
            to="/docs/"
            class="bg-primary hover:bg-primary-hover rounded-full px-6 py-3 font-medium text-white transition-colors"
            >Getting started</NuxtLink
          >
          <a
            :href="repository"
            target="_blank"
            rel="noopener"
            class="text-dark ring-gray/20 hover:ring-gray/40 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-medium ring-1 transition-colors"
            ><Github class="size-[1.15em]" :stroke-width="2" />Read the source</a
          >
        </div>
      </FadeIn>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Github } from "lucide-vue-next";

// The same repository the header points at. Two places, one address — if it
// ever moves, it moves in both.
const repository = "https://github.com/florian-strasser/LokalBoards";
</script>
