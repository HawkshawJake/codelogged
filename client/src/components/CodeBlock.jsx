// components/CodeBlock.jsx
// Renders a styled, scrollable code block with a copy-to-clipboard button.
// No external syntax highlighting library — keeps the bundle small.
// Highlight.js or Shiki can be dropped in later if needed.

import { useState } from 'react'

export default function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <span className="text-[11px] text-neutral-600 font-mono">
          {language || detectLanguage(code)}
        </span>
        <button
          onClick={handleCopy}
          className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto px-4 py-4 text-sm font-mono text-neutral-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Basic language sniff from the first comment line
function detectLanguage(code) {
  if (!code) return 'code'
  const first = code.trimStart().slice(0, 20)
  if (first.startsWith('#')) return 'python'
  if (first.startsWith('//')) return 'javascript'
  if (first.startsWith('/*')) return 'javascript'
  return 'code'
}
