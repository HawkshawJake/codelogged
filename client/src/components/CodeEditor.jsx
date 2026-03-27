// components/CodeEditor.jsx
// CodeMirror 6 wrapper component.
// Accepts initialCode and calls onChange on every edit.
// Use the `taskId` prop (via key on the parent) to remount when the task changes.

import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'

// Override the one-dark background to match the app's #111 palette
const darkTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#111111',
    fontSize: '13px',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace',
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    backgroundColor: '#111111',
    borderRight: '1px solid #2a2a2a',
    color: '#444',
  },
  '.cm-activeLineGutter': { backgroundColor: '#1a1a1a' },
  '.cm-activeLine': { backgroundColor: '#1a1a1a' },
  '.cm-focused .cm-cursor': { borderLeftColor: '#e5e5e5' },
  '&.cm-focused': { outline: 'none' },
})

// Pick CodeMirror language extension from a plain string
function getLangExtension(language) {
  const lang = (language || '').toLowerCase()
  if (lang === 'python') return python()
  // Default to JS for JS/TS/React tasks
  return javascript({ jsx: true, typescript: lang === 'typescript' })
}

export default function CodeEditor({ initialCode = '', onChange, language = 'javascript' }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          basicSetup,
          getLangExtension(language),
          oneDark,
          darkTheme,
          // Fire onChange whenever the document changes
          EditorView.updateListener.of(update => {
            if (update.docChanged && onChange) {
              onChange(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // Mount once — parent uses a key to remount on task change

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden"
      style={{ backgroundColor: '#111111' }}
    />
  )
}
