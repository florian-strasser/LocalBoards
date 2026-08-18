<template>
  <section id="about" class="section">
    <div class="container">
      <ScrollText :text="text" />

      <!-- The byline the old creator section used to be: who wrote it, and
           nothing more. A page about a piece of software does not need three
           paragraphs about its author, but it should say there is one. -->
      <FadeIn :amount="0.4" class="mt-10">
        <a
          href="https://www.florian-strasser.de"
          target="_blank"
          rel="noopener"
          class="group inline-flex items-center gap-5"
        >
          <img
            src="/images/creator_florian_strasser.webp"
            alt="Florian Strasser"
            width="64"
            height="64"
            class="size-20 rounded-full object-cover"
          />
          <span class="block">
            <span
              class="text-dark block group-hover:text-primary text-2xl"
              >Florian Strasser</span
            >
            <span class="block font-light text-gray">Creator of LokalBoards</span>
          </span>
        </a>
      </FadeIn>
    </div>
  </section>
</template>

<script setup lang="ts">
// Authored copy, not user input — `ScrollText` renders it with `v-html` so the
// paragraph can carry markup.
const text = `LokalBoards is a Kanban board for teams that runs on your own server. Boards, cards, checklists, comments and files, updating live for everyone looking at them — and a built-in MCP server, so an AI agent can work the same board with an API key you issue and can revoke.`;
</script>
