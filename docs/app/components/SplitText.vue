<template>
  <component :is="as" ref="root" class="split-text">
    <!-- The real sentence, once, for anyone not reading the pieces. It used to
         be an `aria-label` on the container, which is not permitted on an
         element with no role — a `p` or a `span` — so the attribute was both
         invalid and, on some assistive technology, ignored. A visually hidden
         copy is what it should have been: read normally, never seen. -->
    <span class="sr-only">{{ text }}</span>
    <!--
      The text is rebuilt from pieces, so it must not be read twice. Every
      fragment below is hidden from assistive technology and exists purely to be
      animated.

      Words are the outer unit even in `by="char"` mode, because a word that can
      break mid-way across a line looks broken. Each word is an inline-block
      with `overflow: hidden` — the mask the pieces rise out of, which is what
      makes this a reveal rather than a fade.
    -->
    <span
      v-for="(word, wordIndex) in words"
      :key="wordIndex"
      aria-hidden="true"
      class="split-text__word"
    >
      <Motion
        v-for="piece in word.pieces"
        :key="piece.index"
        as="span"
        class="split-text__piece"
        :initial="hidden"
        :animate="revealed ? shown : hidden"
        :transition="{
          duration: 0.8,
          delay: delay + piece.index * stagger,
          ease: [0.16, 1, 0.3, 1],
        }"
        >{{ piece.text }}</Motion
      ><span class="split-text__space" aria-hidden="true">&nbsp;</span>
    </span>
  </component>
</template>

<script setup lang="ts">
import { useInView } from "motion-v";

const props = defineProps({
  text: { type: String, required: true },
  // `char` gives the fine-grained cascade for headlines; `word` is calmer and
  // better for anything longer than a line or two.
  by: { type: String as () => "char" | "word", default: "char" },
  as: { type: String, default: "span" },
  // Seconds between one piece starting and the next.
  stagger: { type: Number, default: 0.03 },
  delay: { type: Number, default: 0 },
  amount: { type: Number, default: 0.2 },
});

const hidden = { y: "110%", opacity: 0 };
const shown = { y: "0%", opacity: 1 };

const root = useTemplateRef<HTMLElement>("root");

// The observer watches the whole headline, never the individual pieces.
//
// Per-piece `whileInView` cannot work here and the reason is worth keeping:
// each piece starts translated 110% down, which puts it outside its own
// `overflow: hidden` word wrapper. An IntersectionObserver measures the
// element's rect *after* ancestor clipping, so a hidden piece is 0% visible,
// never crosses the threshold, and never animates — it stays invisible for
// ever. Watching the container also means one observer per headline instead of
// one per character.
const revealed = useInView(root, { once: true, amount: props.amount });

// A flat running index across the whole string drives the stagger, so the
// cascade continues across word boundaries instead of restarting each word.
const words = computed(() => {
  let index = 0;
  return props.text.split(" ").map((word) => ({
    pieces:
      props.by === "char"
        ? [...word].map((char) => ({ text: char, index: index++ }))
        : [{ text: word, index: index++ }],
  }));
});
</script>
