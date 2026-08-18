<template>
  <section class="relative pb-16">
    <div class="relative pt-24 pb-32">
        <div class="absolute inset-0 bg-primary" aria-hidden="true">
            <HeroClouds />
            <div class="absolute top-0 left-0 w-full h-full bg-linear-to-t from-white to-white/0"/>
        </div>
        <div class="container relative z-10">
            <div class="mx-auto max-w-2xs xs:max-w-md sm:max-w-xl md:max-w-3xl pt-10 text-center sm:pt-16">
                <SplitText
                as="p"
                text="Open-Source Kanban boards for teams"
                :stagger="0.02"
                class="text-sm text-white/80 sm:text-base"
                />

                <h1
                class="mt-3  leading-[1.08] font-medium text-white text-3xl xs:text-4xl sm:text-5xl md:text-6xl"
                >
                <SplitText text="Where Humans &amp; Agents work together." :delay="0.15" />
                </h1>

                <FadeIn :delay="0.9" :distance="16" class="mt-8">
                <NuxtLink
                    to="/docs/"
                    class="inline-block rounded-full bg-white px-6 py-3 text-primary transition-colors hover:bg-white/90"
                    >Getting started</NuxtLink
                >
                </FadeIn>
            </div>
        </div>
    </div>
    <div class="container relative z-10">
      <!-- It starts with the headline rather than queueing behind it, and takes
           more than twice as long to arrive. Waiting for its turn at 1.1s left
           the largest thing on the page as the last to appear, which read as a
           delay rather than as a sequence; beginning together and moving slower
           still lets it settle last, because it is the one that takes longest,
           not the one that starts latest. -->
      <FadeIn
        :delay="0.15"
        :duration="1.1"
        :distance="40"
        :ease="[0.4, 0, 0.2, 1]"
        :amount="0.05"
        class="transform -translate-y-16"
      >
        <div
          class="overflow-clip rounded-2xl bg-slate shadow-2xl ring-1 ring-black/5"
        >
          <!-- Two captures of the same board, one per shape. The 1440-wide one
               scaled into a phone's width turned the cards into specks; the
               phone-shaped one is the interface as it actually is at that size,
               taken by the same demo run (`40-board-kanban-mobile`). Both carry
               their own dimensions so the space is reserved before either
               loads, and the two ratios differ. -->
          <picture>
            <source
              media="(width < 30rem)"
              srcset="/images/hero-screenshot-mobile.webp"
              width="786"
              height="1494"
            />
            <img
              src="/images/hero-screenshot.webp"
              alt="A LokalBoards board with three areas of cards"
              width="1440"
              height="900"
              class="block h-auto w-full"
            />
          </picture>
        </div>
      </FadeIn>
    </div>
  </section>
</template>
