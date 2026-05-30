<template>
    <div class="solidity-editor">
        <div ref="host" class="editor-host"></div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import {
    bracketMatching,
    indentOnInput,
    syntaxHighlighting,
    HighlightStyle,
} from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { solidity } from './solidity-mode'

const solidityHighlight = HighlightStyle.define([
    { tag: t.keyword, class: 'cm-sol-keyword' },
    { tag: t.typeName, class: 'cm-sol-type' },
    { tag: t.atom, class: 'cm-sol-atom' },
    { tag: t.number, class: 'cm-sol-number' },
    { tag: t.string, class: 'cm-sol-string' },
    { tag: t.comment, class: 'cm-sol-comment' },
    { tag: t.special(t.variableName), class: 'cm-sol-builtin' },
])

@Component
export default class SolidityEditor extends Vue {
    @Prop({ required: true }) files!: Record<string, string>
    @Prop({ required: true }) activeFile!: string

    private view: EditorView | null = null
    private currentFile: string = this.activeFile

    mounted() {
        const host = this.$refs.host as HTMLElement
        this.view = new EditorView({
            state: this.makeState(this.files[this.activeFile] || ''),
            parent: host,
        })
        this.currentFile = this.activeFile
    }

    beforeDestroy() {
        if (this.view) {
            this.view.destroy()
            this.view = null
        }
    }

    @Watch('activeFile')
    onActiveFileChange(next: string, prev: string) {
        if (!this.view) return
        // Flush previous file's text to the parent before switching.
        if (prev && prev !== next) {
            const text = this.view.state.doc.toString()
            this.$emit('change-file', prev, text)
        }
        this.view.setState(this.makeState(this.files[next] || ''))
        this.currentFile = next
    }

    @Watch('files', { deep: true })
    onFilesChange() {
        if (!this.view) return
        const incoming = this.files[this.activeFile] || ''
        if (incoming !== this.view.state.doc.toString()) {
            this.view.dispatch({
                changes: { from: 0, to: this.view.state.doc.length, insert: incoming },
            })
        }
    }

    private makeState(initial: string) {
        return EditorState.create({
            doc: initial,
            extensions: [
                lineNumbers(),
                history(),
                bracketMatching(),
                indentOnInput(),
                highlightActiveLine(),
                solidity,
                syntaxHighlighting(solidityHighlight),
                keymap.of([...defaultKeymap, ...historyKeymap]),
                EditorView.updateListener.of((u) => {
                    if (u.docChanged) {
                        this.$emit(
                            'change-file',
                            this.currentFile,
                            u.state.doc.toString(),
                        )
                    }
                }),
                EditorView.theme({
                    '&': { height: '100%', fontSize: '13px' },
                    '.cm-content': { fontFamily: 'monospace' },
                    '.cm-scroller': { overflow: 'auto' },
                }),
            ],
        })
    }
}
</script>

<style lang="scss" scoped>
.solidity-editor {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--card-background);
    height: 100%;
}
.editor-host {
    flex: 1;
    overflow: hidden;
    min-height: 0;
}
::v-deep .cm-editor {
    height: 100%;
}

/* Solidity syntax highlighting — light theme colors */
::v-deep .cm-sol-keyword { color: #a626a4; font-weight: 600; }
::v-deep .cm-sol-type    { color: #4078f2; }
::v-deep .cm-sol-atom    { color: #986801; }
::v-deep .cm-sol-number  { color: #986801; }
::v-deep .cm-sol-string  { color: #50a14f; }
::v-deep .cm-sol-comment { color: #a0a1a7; font-style: italic; }
::v-deep .cm-sol-builtin { color: #e45649; font-weight: 600; }

[data-theme='dark'] ::v-deep .cm-editor {
    background: var(--card-background);
    color: #d4d4d4;
}
[data-theme='dark'] ::v-deep .cm-gutters {
    background: var(--body-background-alt);
    color: #6a6a6a;
    border-right-color: var(--border-color);
}
[data-theme='dark'] ::v-deep .cm-activeLine {
    background: rgba(255, 255, 255, 0.04);
}
[data-theme='dark'] ::v-deep .cm-activeLineGutter {
    background: rgba(255, 255, 255, 0.06);
}
[data-theme='dark'] ::v-deep .cm-sol-keyword { color: #c678dd; }
[data-theme='dark'] ::v-deep .cm-sol-type    { color: #61afef; }
[data-theme='dark'] ::v-deep .cm-sol-atom    { color: #d19a66; }
[data-theme='dark'] ::v-deep .cm-sol-number  { color: #d19a66; }
[data-theme='dark'] ::v-deep .cm-sol-string  { color: #98c379; }
[data-theme='dark'] ::v-deep .cm-sol-comment { color: #7d8597; }
[data-theme='dark'] ::v-deep .cm-sol-builtin { color: #e06c75; }
</style>
