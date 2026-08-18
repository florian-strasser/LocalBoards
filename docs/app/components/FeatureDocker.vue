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
