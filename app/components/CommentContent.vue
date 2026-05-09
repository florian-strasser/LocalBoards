<template>
    <div
        class="wysiwyg-wrapper"
        v-html="props.content"
        @change="handleCheckboxChange"
    />
</template>

<script setup lang="ts">
const props = defineProps({
    content: String,
    commentId: Number,
    cardId: Number,
    boardId: Number,
    writeAccess: Boolean,
});

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
        await $fetch("/api/data/comment", {
            method: "PATCH",
            body: {
                id: props.commentId,
                content: updatedContent,
                cardId: props.cardId,
                boardId: props.boardId,
            },
        });
    } catch (error) {
        console.error("Failed to update comment checkpoint:", error);
        // Revert the change if API call fails
        listItem.setAttribute("data-checked", String(!isChecked));
        (target as HTMLInputElement).checked = !isChecked;
    }
};
</script>
