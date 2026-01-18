<template>
    <div>
        <ul v-if="editor" class="editor-toolbar flex gap-3 flex-wrap">
            <li>
                <button
                    type="button"
                    @click="editor.chain().focus().toggleBold().run()"
                    :disabled="!editor.can().chain().focus().toggleBold().run()"
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
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
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('codeBlock') }"
                    v-tooltip="$t('editorCodeblock')"
                >
                    <Code class="size-5" />
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
} from "lucide-vue-next";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Image from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";
import StarterKit from "@tiptap/starter-kit";

const model = defineModel();

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
</script>
