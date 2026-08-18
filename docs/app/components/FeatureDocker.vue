<template>
  <div class="ui doc" aria-hidden="true">
    <!-- The whole install, which is the point of the tile: one command, no
         database to provision first. This is the command from the README.

         The command sits in a `<code>` inside the `<pre>` rather than directly
         in it: the `<pre>` is what centres its content vertically, and a grid
         container turns every child into a row of its own — with the spans as
         direct children that broke the command into one fragment per line. -->
    <pre class="ui-code doc__code"><code><span class="ui-code__comment"># one command, no database to set up</span>
docker run <span class="ui-code__key">-d</span> \
  <span class="ui-code__key">-p</span> 3000:3000 \
  <span class="ui-code__key">-v</span> lokalboards:/var/lib/mysql \
  <span class="ui-code__key">-e</span> NUXT_APP_NAME="Acme Boards" \
  florianstrasser/lokalboards

<span class="ui-code__comment"># or point it at a database</span>
  <span class="ui-code__key">-e</span> NUXT_MYSQL_HOST=db.internal</code></pre>
  </div>
</template>

<style scoped>
.doc {
  position: absolute;
  inset: 0;
  display: grid;
}
.doc__code {
  margin: 0;
  /* Fills the tile like the dialog panels in the same row do, rather than
     sitting in the middle of it at whatever height the command happens to be.
     The gutters even out at 2.5em on the sides: the command is centred, so the
     top and bottom get half the leftover height whatever the padding says. */
  height: 100%;
  display: grid;
  align-content: center;
  padding: 1.1em 2.5em;
  border-radius: 0.9rem;
  white-space: pre;
  /* Clipped, not scrollable. In the documentation a scrollbar on a code block
     is the right answer — somebody is there to read the whole command. Here the
     command is decoration, so a scrollbar is an invitation to read something
     that does not need reading. */
  overflow: hidden;
}
.doc__code code {
  font: inherit;
  /* The mask is on the text rather than on the panel, so the line fades out at
     the edge while the panel behind it stays solid. */
  mask-image: linear-gradient(to right, #000 86%, transparent 99%);
}
</style>
