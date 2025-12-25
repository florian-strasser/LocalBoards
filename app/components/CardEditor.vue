<template>
    <div>
        <ul v-if="editor" class="editor-toolbar flex gap-3 flex-wrap">
            <li>
                <button
                    @click="editor.chain().focus().toggleBold().run()"
                    :disabled="!editor.can().chain().focus().toggleBold().run()"
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('bold') }"
                >
                    <Bold class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="editor.chain().focus().toggleItalic().run()"
                    :disabled="
                        !editor.can().chain().focus().toggleItalic().run()
                    "
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('italic') }"
                >
                    <Italic class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="editor.chain().focus().toggleStrike().run()"
                    :disabled="
                        !editor.can().chain().focus().toggleStrike().run()
                    "
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('strike') }"
                >
                    <Strikethrough class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="editor.chain().focus().toggleBulletList().run()"
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('bulletList') }"
                >
                    <List class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="editor.chain().focus().toggleOrderedList().run()"
                    class="hover:text-secondary"
                    :class="{
                        'text-secondary': editor.isActive('orderedList'),
                    }"
                >
                    <ListOrdered class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="editor.chain().focus().toggleTaskList().run()"
                    class="hover:text-secondary"
                    :class="{
                        'text-secondary': editor.isActive('taskList'),
                    }"
                >
                    <ListChecks class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="addImage"
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('image') }"
                >
                    <FileImage class="size-5" />
                </button>
            </li>
            <li>
                <button
                    @click="editor.chain().focus().toggleCodeBlock().run()"
                    class="hover:text-secondary"
                    :class="{ 'text-secondary': editor.isActive('codeBlock') }"
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
            placeholder: "Write something …",
        }),
        Image,
        FileHandler.configure({
            allowedMimeTypes: [
                "image/png",
                "image/jpeg",
                "image/gif",
                "image/webp",
            ],
            onDrop: (currentEditor, files, pos) => {
                files.forEach((file) => {
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
</script>
