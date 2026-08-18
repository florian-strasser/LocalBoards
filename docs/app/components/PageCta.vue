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
