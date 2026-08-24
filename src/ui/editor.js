// CodeMirror 6 Editor integration for MarkMirror Mobile

import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';

export class MarkdownEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            theme: 'light',
            autoComplete: true,
            onChange: null,
            onScroll: null,
            ...options
        };
        
        this.view = null;
        this.completions = this.createMarkdownCompletions();
        this.init();
    }

    // Initialize the editor
    init() {
        const extensions = [
            basicSetup,
            markdown(),
            keymap.of(completionKeymap),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && this.options.onChange) {
                    this.options.onChange(this.getContent());
                }
            }),
            EditorView.domEventHandlers({
                scroll: (event, view) => {
                    if (this.options.onScroll) {
                        const scrollInfo = this.getScrollInfo();
                        this.options.onScroll(scrollInfo);
                    }
                }
            })
        ];

        // Add theme
        if (this.options.theme === 'dark') {
            extensions.push(oneDark);
        }

        // Add autocompletion if enabled
        if (this.options.autoComplete) {
            extensions.push(autocompletion({
                override: [this.markdownCompletionSource.bind(this)]
            }));
        }

        const state = EditorState.create({
            doc: this.options.initialContent || '',
            extensions
        });

        this.view = new EditorView({
            state,
            parent: this.container
        });
    }

    // Create Markdown completions
    createMarkdownCompletions() {
        return [
            // Headers
            { label: '# ', detail: 'Header 1', type: 'keyword' },
            { label: '## ', detail: 'Header 2', type: 'keyword' },
            { label: '### ', detail: 'Header 3', type: 'keyword' },
            { label: '#### ', detail: 'Header 4', type: 'keyword' },
            { label: '##### ', detail: 'Header 5', type: 'keyword' },
            { label: '###### ', detail: 'Header 6', type: 'keyword' },
            
            // Text formatting
            { label: '**bold**', detail: 'Bold text', type: 'keyword' },
            { label: '*italic*', detail: 'Italic text', type: 'keyword' },
            { label: '~~strikethrough~~', detail: 'Strikethrough text', type: 'keyword' },
            { label: '`code`', detail: 'Inline code', type: 'keyword' },
            
            // Lists
            { label: '- ', detail: 'Unordered list item', type: 'keyword' },
            { label: '1. ', detail: 'Ordered list item', type: 'keyword' },
            { label: '- [ ] ', detail: 'Task list item (unchecked)', type: 'keyword' },
            { label: '- [x] ', detail: 'Task list item (checked)', type: 'keyword' },
            
            // Links and images
            { label: '[text](url)', detail: 'Link', type: 'keyword' },
            { label: '![alt](url)', detail: 'Image', type: 'keyword' },
            
            // Code blocks
            { label: '```\ncode\n```', detail: 'Code block', type: 'keyword' },
            { label: '```javascript\ncode\n```', detail: 'JavaScript code block', type: 'keyword' },
            { label: '```python\ncode\n```', detail: 'Python code block', type: 'keyword' },
            { label: '```html\ncode\n```', detail: 'HTML code block', type: 'keyword' },
            { label: '```css\ncode\n```', detail: 'CSS code block', type: 'keyword' },
            
            // Other elements
            { label: '> ', detail: 'Blockquote', type: 'keyword' },
            { label: '---', detail: 'Horizontal rule', type: 'keyword' },
            { label: '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |', detail: 'Table', type: 'keyword' },
            
            // HTML elements
            { label: '<details>\n<summary>Summary</summary>\nContent\n</details>', detail: 'Details/Summary', type: 'keyword' },
            { label: '<kbd>key</kbd>', detail: 'Keyboard key', type: 'keyword' },
            { label: '<mark>highlighted</mark>', detail: 'Highlighted text', type: 'keyword' }
        ];
    }

    // Markdown completion source
    markdownCompletionSource(context) {
        const word = context.matchBefore(/\w*/);
        if (word.from === word.to && !context.explicit) {
            return null;
        }

        return {
            from: word.from,
            options: this.completions.map(completion => ({
                label: completion.label,
                detail: completion.detail,
                type: completion.type,
                apply: completion.label
            }))
        };
    }

    // Get editor content
    getContent() {
        return this.view ? this.view.state.doc.toString() : '';
    }

    // Set editor content
    setContent(content) {
        if (this.view) {
            const transaction = this.view.state.update({
                changes: {
                    from: 0,
                    to: this.view.state.doc.length,
                    insert: content
                }
            });
            this.view.dispatch(transaction);
        }
    }

    // Get scroll information
    getScrollInfo() {
        if (!this.view) return { top: 0, height: 0, clientHeight: 0 };
        
        const dom = this.view.scrollDOM;
        return {
            top: dom.scrollTop,
            height: dom.scrollHeight,
            clientHeight: dom.clientHeight,
            percentage: dom.scrollHeight > 0 ? dom.scrollTop / (dom.scrollHeight - dom.clientHeight) : 0
        };
    }

    // Scroll to position
    scrollTo(position) {
        if (this.view) {
            const dom = this.view.scrollDOM;
            if (typeof position === 'number') {
                // Scroll by percentage
                const maxScroll = dom.scrollHeight - dom.clientHeight;
                dom.scrollTop = maxScroll * position;
            } else if (position.top !== undefined) {
                dom.scrollTop = position.top;
            }
        }
    }

    // Update theme
    updateTheme(theme) {
        this.options.theme = theme;
        // Note: In a real implementation, you'd need to reconfigure the editor
        // For now, we'll just store the preference
    }

    // Toggle autocompletion
    toggleAutoComplete(enabled) {
        this.options.autoComplete = enabled;
        // Note: In a real implementation, you'd need to reconfigure the editor
    }

    // Focus the editor
    focus() {
        if (this.view) {
            this.view.focus();
        }
    }

    // Get character count
    getCharacterCount() {
        return this.getContent().length;
    }

    // Get line count
    getLineCount() {
        return this.view ? this.view.state.doc.lines : 0;
    }

    // Get selected text
    getSelection() {
        if (!this.view) return '';

        const selection = this.view.state.selection.main;
        return this.view.state.doc.sliceString(selection.from, selection.to);
    }

    // Set selection
    setSelection(from, to) {
        if (!this.view) return;

        this.view.dispatch({
            selection: { anchor: from, head: to },
            scrollIntoView: true
        });
    }

    // Replace text in range
    replaceRange(from, to, text) {
        if (!this.view) return;

        this.view.dispatch({
            changes: { from, to, insert: text }
        });
    }

    // Get cursor position
    getCursor() {
        if (!this.view) return 0;
        return this.view.state.selection.main.head;
    }

    // Set cursor position
    setCursor(pos) {
        if (!this.view) return;

        this.view.dispatch({
            selection: { anchor: pos, head: pos },
            scrollIntoView: true
        });
    }

    // Focus the editor
    focus() {
        if (this.view) {
            this.view.focus();
        }
    }

    // Destroy the editor
    destroy() {
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
    }
}
