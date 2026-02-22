<template>
    <div>
        <ul
            v-if="emojiSelect && editor"
            class="editor-toolbar flex gap-2 flex-wrap items-center mb-1"
        >
            <li>
                <button
                    type="button"
                    @click="emojiSelect = false"
                    class="block hover:text-secondary"
                    v-tooltip="$t('back')"
                >
                    <ArrowLeft class="size-5" />
                </button>
            </li>
            <li v-for="item in emojiList">
                <button class="block" @click="setEmoji(item.code)">
                    {{ item.icon }}
                </button>
            </li>
        </ul>
        <ul
            v-else-if="editor"
            class="editor-toolbar flex gap-2 flex-wrap py-0.5 mb-1"
        >
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleBold().run()"
                    :disabled="!editor.can().chain().focus().toggleBold().run()"
                    class="block hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('bold') }"
                    v-tooltip="$t('editorBold')"
                >
                    <Bold class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleItalic().run()"
                    :disabled="
                        !editor.can().chain().focus().toggleItalic().run()
                    "
                    class="block hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('italic') }"
                    v-tooltip="$t('editorItalic')"
                >
                    <Italic class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleStrike().run()"
                    :disabled="
                        !editor.can().chain().focus().toggleStrike().run()
                    "
                    class="block hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('strike') }"
                    v-tooltip="$t('editorStrike')"
                >
                    <Strikethrough class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleBulletList().run()"
                    class="block hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('bulletList') }"
                    v-tooltip="$t('editorBulletList')"
                >
                    <List class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleOrderedList().run()"
                    class="block hover:text-secondary"
                    :class="{
                        'text-secondary': editor.isActive('orderedList'),
                    }"
                    v-tooltip="$t('editorOrderedList')"
                >
                    <ListOrdered class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleTaskList().run()"
                    class="block hover:text-secondary"
                    :class="{
                        'text-secondary': editor.isActive('taskList'),
                    }"
                    v-tooltip="$t('editorCheckList')"
                >
                    <ListChecks class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="addImage"
                    class="block hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('image') }"
                    v-tooltip="$t('editorImage')"
                >
                    <FileImage class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleCodeBlock().run()"
                    class="block hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('codeBlock') }"
                    v-tooltip="$t('editorCodeblock')"
                >
                    <Code class="size-5" />
                </button>
            </li>
            <li>
                <button
                    type="button"
                    @click="emojiSelect = true"
                    class="block hover:text-secondary"
                    v-tooltip="$t('editorEmojis')"
                >
                    <Smile class="size-5" />
                </button>
            </li>
        </ul>
        <EditorContent :editor="editor" />
    </div>
</template>
<script setup lang="ts">
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    FileImage,
    Code,
    ListChecks,
    Smile,
    ArrowLeft,
} from "lucide-vue-next";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Image from "@tiptap/extension-image";
import Emoji, { emojis } from "@tiptap/extension-emoji";
import FileHandler from "@tiptap/extension-file-handler";
import StarterKit from "@tiptap/starter-kit";

const model = defineModel();
const emojiSelect = ref(false);

const emojiList = [
    { icon: "👍", code: "+1" },
    { icon: "👎", code: "-1" },
    { icon: "😄", code: "smile" },
    { icon: "😢", code: "cry" },
    { icon: "😓", code: "sweat" },
    { icon: "🎉", code: "party" },
    { icon: "🔥", code: "fire" },
    { icon: "🚀", code: "rocket" },
];

const editor = useEditor({
    content: model.value,
    extensions: [
        StarterKit.configure({
            Heading: false,
        }),
        Placeholder.configure({
            placeholder: $t("writeSomething"),
        }),
        Image.configure({
            allowBase64: true,
        }),
        Emoji.configure({
            emojis: emojis,
            enableEmoticons: true,
        }),
        FileHandler.configure({
            allowedMimeTypes: [
                "image/png",
                "image/jpg",
                "image/jpeg",
                "image/gif",
                "image/webp",
                "image/avif",
            ],
            onDrop: (currentEditor, files, pos) => {
                files.forEach(async (file) => {
                    const fileReader = new FileReader();

                    fileReader.readAsDataURL(file);
                    fileReader.onload = () => {
                        currentEditor
                            .chain()
                            .insertContentAt(pos, {
                                type: "image",
                                attrs: {
                                    src: fileReader.result,
                                },
                            })
                            .focus()
                            .run();
                    };
                    model.value = editor.value.getHTML();
                });
            },
            onPaste: (currentEditor, files) => {
                files.forEach((file) => {
                    const fileReader = new FileReader();

                    fileReader.readAsDataURL(file);
                    fileReader.onload = () => {
                        currentEditor
                            .chain()
                            .insertContentAt(
                                currentEditor.state.selection.anchor,
                                {
                                    type: "image",
                                    attrs: {
                                        src: fileReader.result,
                                    },
                                },
                            )
                            .focus()
                            .run();
                    };
                    model.value = editor.value.getHTML();
                });
            },
        }),
        TaskList,
        TaskItem,
    ],
    onBlur: () => {
        model.value = editor.value.getHTML();
    },
    injectCSS: false,
});
const addImage = () => {
    const url = window.prompt("URL");
    if (url) {
        editor.chain().focus().setImage({ src: url }).run();
    }
};
const uploadImage = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await $fetch("/api/upload/image", {
            method: "POST",
            body: formData,
        });
        console.log(response);
        if (!response.success) {
            throw new Error("Failed to upload image");
        }

        if (response.success && response.imageUrl) {
            return { image: response.imageUrl };
        } else {
            throw new Error("Invalid response from server");
        }
    } catch (error) {
        return { error: `Error uploading image: {$error}` };
        // You might want to show an error message to the user here
    }
};

const setEmoji = (emojiCode) => {
    editor.value.chain().focus().setEmoji(emojiCode).run();
    emojiSelect.value = false;
};
</script>
