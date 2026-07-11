<template>
    <div class="comment-content-container">
        <div
            class="wysiwyg-wrapper"
            v-html="sanitizeHtml(props.content)"
            @change="handleCheckboxChange"
            @click="handleContentClick"
        />
        <ImageWindow
            v-model="imageModalOpen"
            bare
            :image-src="selectedImageSrc"
            :alt="selectedImageAlt || 'Enlarged image'"
            :source-rect="zoomSourceRect"
        />
    </div>
</template>
<script setup lang="ts">
const props = defineProps({
    content: String,
    commentId: Number,
    cardId: Number,
    boardId: Number,
    writeAccess: Boolean,
});

const emits = defineEmits(["updated"]);

const imageModalOpen = ref(false);
const selectedImageSrc = ref("");
const selectedImageAlt = ref("");
const zoomSourceRect = ref(null);

const handleContentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "IMG") {
        event.preventDefault();
        const r = target.getBoundingClientRect();
        zoomSourceRect.value = {
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
        };
        selectedImageSrc.value = target.getAttribute("src") || "";
        selectedImageAlt.value = target.getAttribute("alt") || "";
        imageModalOpen.value = true;
    }
};

const handleCheckboxChange = async (event: Event) => {
    const target = event.target as HTMLElement;

    // Only handle checkbox clicks
    if (
        target.tagName !== "INPUT" ||
        target.getAttribute("type") !== "checkbox"
    ) {
        return;
    }

    const listItem = target.closest('[data-type="taskItem"]');
    if (!listItem) return;

    // Toggle the checked state on the list item and input
    const isChecked = (target as HTMLInputElement).checked;
    listItem.setAttribute("data-checked", String(isChecked));

    // Sync the input's checked attribute with the state
    if (isChecked) {
        target.setAttribute("checked", "checked");
    } else {
        target.removeAttribute("checked");
    }

    // Get the updated taskList HTML
    const taskList = listItem.closest('[data-type="taskList"]');
    if (!taskList) return;

    // Only proceed if user has write access
    if (!props.writeAccess) return;

    // Get the taskList HTML with updated attributes
    const updatedContent = taskList.outerHTML;
    try {
        const res = await $fetch("/api/data/comment", {
            method: "PATCH",
            body: {
                id: props.commentId,
                content: updatedContent,
                cardId: props.cardId,
                boardId: props.boardId,
            },
        });
        // Propagate the saved comment up so the local state (and the board's
        // prefetched card) stay in sync and it's broadcast to other users.
        if (res?.comment) emits("updated", res.comment);
    } catch (error) {
        console.error("Failed to update comment checkpoint:", error);
        // Revert the change if API call fails
        listItem.setAttribute("data-checked", String(!isChecked));
        (target as HTMLInputElement).checked = !isChecked;
    }
};
</script>
<style>
/* Images in rendered content (card description + comments) are click-to-zoom;
   the zoom cursor and a subtle lift on hover signal that they're openable. */
.wysiwyg-wrapper img {
    cursor: zoom-in;
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}
.wysiwyg-wrapper img:hover {
    transform: scale(1.015);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
</style>
