<template>
  <section id="pricing" class="section">
    <div class="container">
      <!-- The small line answers the question people arrive at a pricing
           section with, rather than introducing the word below it. "Our" was
           grammar holding a slot open: it told a reader who had got this far
           nothing they did not already know. -->
      <SplitText
        as="p"
        text="Free unless we run it for you"
        :stagger="0.02"
        class="text-primary sm:text-lg"
      />
      <SplitText
        as="h2"
        text="Pricing"
        :delay="0.2"
        class="text-dark mb-8 text-3xl xs:text-4xl sm:text-5xl"
      />

      <div class="grid gap-5 sm:grid-cols-2">
        <!-- `h-full` all the way down, so the two cards match whichever has the
             longer list and the shorter one grows the gap above its button
             rather than ending early. -->
        <FadeIn
          v-for="plan in plans"
          :key="plan.name"
          class="h-full"
          :amount="0.15"
        >
          <div
            class="flex h-full flex-col rounded-3xl p-8 text-center"
            :class="
              plan.featured ? 'bg-primary/8 ring-1 ring-primary/15' : 'bg-slate'
            "
          >
            <h3 class="text-dark text-lg font-medium">{{ plan.name }}</h3>
            <p class="text-dark mt-1 text-5xl font-semibold tracking-tight">
              {{ plan.price }}
            </p>
            <p class="mt-1 text-gray">{{ plan.period }}</p>

            <!-- Rules between the rows rather than around them: the list should
                 read as one block of facts, not a stack of boxes. Hence the
                 rule on top of every row but the first — there is nothing above
                 it to separate from. -->
            <ul class="mt-4 text-center">
              <li
                v-for="(line, index) in plan.features"
                :key="line"
                class="py-3"
                :class="{ 'border-t border-gray/15': index > 0 }"
              >
                {{ line }}
              </li>
            </ul>

            <!-- Takes up whatever slack the shorter card has, which is what
                 pins both buttons to the bottom. -->
            <div class="mt-4 grow" />
            <NuxtLink
              v-if="plan.to"
              :to="plan.to"
              class="bg-primary hover:bg-primary-hover block rounded-full px-6 py-3 font-medium text-white transition-colors"
              >{{ plan.cta }}</NuxtLink
            >
            <a
              v-else
              :href="plan.href"
              class="bg-primary hover:bg-primary-hover block rounded-full px-6 py-3 font-medium text-white transition-colors"
              >{{ plan.cta }}</a
            >
          </div>
        </FadeIn>
      </div>

      <FadeIn
        as="p"
        :distance="12"
        class="mt-6 text-center text-sm text-gray max-w-4xl mx-auto"
      >
        Self-hosting is the whole point — the hosted plan is for companies that
        would rather not run a server of their own, not a way of holding
        anything back. Both run the same open-source build. Rolling a hosted
        instance back to an earlier day costs 60 € per restore.
      </FadeIn>
    </div>
  </section>
</template>

<script setup lang="ts">
// The two lists run in the same order — where it runs, what it runs on, who
// updates it, who backs it up, where support comes from — so the eye can cross
// between them row by row. The only thing that changes down the list is who
// does the work. That comparison is the honest argument for the paid plan, and
// it makes the free one look like the complete thing it is.
//
// Every line names something a reader could check or ask for. "More of
// everything whenever you need it" named nothing: it sat directly under the
// line that lists CPU, RAM and storage, and said less than that line already
// had — and it read as though the extra came free. It now names which three
// things can be raised and says plainly that raising them costs more each
// month, in the same spirit as the restore fee below the cards: a charge is
// worth reading before the decision, not on the invoice after it.
//
// The restore fee is named under the cards rather than left for the invoice.
// A charge that only appears on the day something has gone wrong is the worst
// possible moment to learn about it.
const plans = [
  {
    name: "Self-Hosted",
    price: "0 €",
    period: "Forever",
    features: [
      "Runs on your own server",
      "Your hardware, your database, your limits",
      "You apply the updates",
      "You run the backups",
      "Support through GitHub issues and discussions",
    ],
    cta: "Getting started",
    to: "/docs/",
    featured: false,
  },
  {
    name: "Hosted for you",
    price: "49 €",
    period: "Per month",
    features: [
      "Runs in a German data centre",
      "1 CPU, 4 GB of RAM, 100 GB of storage",
      "More CPU, RAM or storage for a monthly surcharge",
      "We apply the updates",
      "14 days of backups to roll back to",
      "Support by e-mail and video call",
    ],
    cta: "Book a consultation",
    href: "mailto:info@lokalboards.com?subject=LokalBoards%20hosting",
    featured: true,
  },
];
</script>
