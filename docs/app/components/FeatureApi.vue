<template>
  <div class="ui api" aria-hidden="true">
    <!-- A real request against the real endpoint, and the agent account that
         would be making it. -->
    <pre class="ui-code api__code"><code><span class="ui-code__comment"># create a card from anything</span>
curl <span class="ui-code__key">-X</span> POST \
  <span class="ui-code__key">-H</span> "Authorization: Bearer $KEY" \
  <span class="ui-code__key">-d</span> '{"area":2,"name":"Release notes"}' \
  boards.example.com<span class="ui-code__key">/api/cards</span>

<span class="ui-code__comment"># → 201 Created</span>
<span class="ui-code__comment"># { "id": 42, "area": 2, "status": 0 }</span></code></pre>

    <div class="ui-card api__card">
      <div class="ui-card__row">
        <span class="ui-status" />
        <span class="ui-card__title">Ship the release notes</span>
        <span class="api__agent"><Bot :stroke-width="2" />Agent</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bot } from "lucide-vue-next";
</script>

<style scoped>
.api {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.7em;
}
.api__code {
  margin: 0;
  white-space: pre;
  /* Clipped rather than scrollable: this is a picture of a request, not a
     request anybody has to read to the end. */
  overflow: hidden;
}
.api__code code {
  font: inherit;
  /* On the text, so the line fades while the panel stays solid. */
  mask-image: linear-gradient(to right, #000 86%, transparent 99%);
}
.api__card {
  background: var(--color-white);
}
.api__agent {
  display: flex;
  align-items: center;
  gap: 0.3em;
  margin-left: auto;
  flex: none;
  padding: 0.15em 0.5em;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  font-size: 0.85em;
  font-weight: 500;
}
.api__agent svg {
  width: 1.1em;
  height: 1.1em;
}
</style>
