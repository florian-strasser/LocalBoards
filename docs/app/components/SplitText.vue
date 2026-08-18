<template>
  <component :is="as" ref="root" :aria-label="text" class="split-text">
    <!--
      The text is rebuilt from pieces, so it must not be read twice. The
      container carries the real sentence as `aria-label`; every fragment below
      is hidden from assistive technology and exists purely to be animated.

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

<style scoped>
/* No `display` of its own. It used to force `inline`, which is what a `span`
   already is — and which quietly broke the component the moment it was asked to
   be the heading rather than sit inside one: an inline `h2` drops its vertical
   margins, so the space under every section title disappeared. Letting the tag
   keep its own display makes `as="h2"` behave like an `h2`. */
/* The mask. `overflow: hidden` on an inline box does nothing, so the word has
   to be inline-block — which also stops a word breaking across lines. The
   padding/margin pair reclaims the descender space (g, y, p) that the clip
   would otherwise cut off. */
.split-text__word {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
}
.split-text__piece {
  display: inline-block;
  will-change: transform;
}
/* A real space between words, outside the mask so it never gets clipped. */
.split-text__space {
  display: inline-block;
  width: 0.25em;
}
.split-text__word:last-child .split-text__space {
  display: none;
}

/* Anyone who has asked for less motion gets the text, immediately, in place. */
@media (prefers-reduced-motion: reduce) {
  .split-text__piece {
    transform: none !important;
    opacity: 1 !important;
  }
}
</style>
