import type { Ref } from "vue";

type Labels = { copy: string; copied: string; failed: string };

// Rendered Markdown reaches the page as a string through `v-html`, so a copy
// button cannot be part of any template — there is no component around those
// nodes to put one in. It is attached to each `<pre>` once the browser has the
// nodes, and re-attached whenever the content is replaced.
//
// Labels are passed in rather than read here, so the composable needs no
// opinion about how the caller gets its translations.
export function useCodeCopy(root: Ref<HTMLElement | null>, labels: () => Labels) {
    // Captured here, in setup, so the click handler can raise a toast later.
    const nuxtApp = useNuxtApp();
    const toast = (message: string) => nuxtApp.callHook("app:toast", { message });

    const ICON_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
    const ICON_DONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const flash = (button: HTMLButtonElement, text: string, done: boolean) => {
        button.innerHTML = done ? ICON_DONE : ICON_COPY;
        button.title = text;
        button.setAttribute("aria-label", text);
        button.classList.toggle("code-copy--done", done);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            button.innerHTML = ICON_COPY;
            button.title = labels().copy;
            button.setAttribute("aria-label", labels().copy);
            button.classList.remove("code-copy--done");
        }, 1600);
    };

    const attach = () => {
        const el = root.value;
        if (!el) return;
        el.querySelectorAll("pre").forEach((pre) => {
            const block = pre as HTMLElement;
            if (block.dataset.copyReady) return;
            block.dataset.copyReady = "true";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "code-copy";
            button.title = labels().copy;
            button.setAttribute("aria-label", labels().copy);
            button.innerHTML = ICON_COPY;

            button.addEventListener("click", async (event) => {
                // The wrapper listens for clicks too — for image zooming and
                // checkboxes — and this one is not for it.
                event.preventDefault();
                event.stopPropagation();
                const code = block.querySelector("code") ?? block;
                // A fenced block ends with a newline that nobody wants pasted.
                const text = (code.textContent ?? "").replace(/\n$/, "");
                try {
                    await navigator.clipboard.writeText(text);
                    // The tick on the button says it happened where the click
                    // was; the toast says it in the place the app puts
                    // everything else that just happened.
                    flash(button, labels().copied, true);
                    toast(labels().copied);
                } catch {
                    flash(button, labels().failed, false);
                    toast(labels().failed);
                }
            });

            block.appendChild(button);
        });
    };

    let observer: MutationObserver | null = null;

    onMounted(() => {
        attach();
        // `v-html` swaps the whole subtree when the description or a comment
        // changes, which takes the buttons with it.
        observer = new MutationObserver(() => attach());
        if (root.value) {
            observer.observe(root.value, { childList: true, subtree: true });
        }
    });

    onBeforeUnmount(() => {
        observer?.disconnect();
        if (timer) clearTimeout(timer);
    });

    return { attach };
}
