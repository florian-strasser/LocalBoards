<template>
  <section
    class="cta relative flex flex-col items-center justify-center py-24 sm:py-32"
  >
    <CtaTiles />
    <div class="container relative z-10">
      <div class="mx-auto max-w-2xl text-center">
        <h2
          class="text-dark leading-[1.1] font-medium text-3xl xs:text-4xl sm:text-5xl"
        >
          <SplitText text="The revolution for your" />
          <span class="block">
            <SplitText text="project management" :delay="0.25" />
          </span>
        </h2>
        <FadeIn :delay="0.5" :distance="16" class="mt-8">
          <NuxtLink
            to="/docs/"
            class="bg-primary hover:bg-primary-hover inline-block rounded-full px-6 py-3 font-medium text-white transition-colors"
            >Getting started</NuxtLink
          >
        </FadeIn>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Height enough for the tiles to have somewhere to travel, taken from the
   viewport's **width**. `min-h-screen` was 100vh, and 100vh is the one length
   on a phone that changes while you are simply scrolling: the URL bar slides
   away, the section grows by a hundred pixels, and the whole tile field jumps
   with it — measured at 74px of movement for a 100px change of height. A width
   is stable through all of that.

   56.25vw is 16:9, the proportion the composition was drawn against, so a
   1920-wide screen still gets the 1080-tall stage it had before. The clamp
   stops an ultra-wide display from turning this into a page of its own. */
.cta {
  min-height: min(56.25vw, 44rem);
}
</style>
