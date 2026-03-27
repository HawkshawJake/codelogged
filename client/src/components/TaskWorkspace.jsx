// components/TaskWorkspace.jsx
// The full task view: email, split IDE + test runner, and reply composer.
// Used both inside the Dashboard right panel and the standalone /task/:id page.
//
// Props:
//   task        — task object from the API
//   onSubmitted — callback(submission) called after a successful reply send

import { useState, useRef, useCallback } from 'react'
import CodeEditor from './CodeEditor'

// -------------------------------------------------------------------------
// Character metadata
// -------------------------------------------------------------------------

const CHAR_META = {
  manager: { name: 'Sarah Chen', role: 'Engineering Manager', initials: 'SC', color: 'bg-blue-600' },
  qa:      { name: 'Marco Rossi', role: 'QA Lead',             initials: 'MR', color: 'bg-yellow-600' },
  pm:      { name: 'Priya Patel', role: 'Product Manager',     initials: 'PP', color: 'bg-green-600' },
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export default function TaskWorkspace({ task, onSubmitted }) {
  const [code, setCode] = useState(task.code_snippet || '')
  const [reply, setReply] = useState('')
  const [testOutput, setTestOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(
    task.status === 'submitted' || task.status === 'reviewed'
  )
  const [submission, setSubmission] = useState(null)   // { text, scores } shape
  const [updatedScores, setUpdatedScores] = useState(null)
  const codeSnippetRef = useRef(null)

  const char = CHAR_META[task.character] || { name: task.character, role: '', initials: '??', color: 'bg-neutral-600' }

  // Scroll to the code snippet anchor when inline link is clicked
  function scrollToCode() {
    codeSnippetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Render email body, replacing [[CODE_SNIPPET]] with a clickable anchor link
  function renderEmailBody(body) {
    if (!body.includes('[[CODE_SNIPPET]]')) {
      return <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">{body}</p>
    }
    const parts = body.split('[[CODE_SNIPPET]]')
    return (
      <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
        {parts[0]}
        <button
          onClick={scrollToCode}
          className="inline text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
        >
          view code snippet
        </button>
        {parts[1]}
      </p>
    )
  }

  // Run tests — calls /api/tasks/:id/run with current editor code
  async function handleRunTests() {
    setRunning(true)
    setTestOutput(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      setTestOutput(data)
    } catch {
      setTestOutput({ error: 'Could not reach server' })
    } finally {
      setRunning(false)
    }
  }

  // Submit — sends solution_code + reply_text to /api/tasks/:id/submit
  async function handleSend(e) {
    e.preventDefault()
    if (!code.trim()) { setSubmitError('Your editor is empty — add your solution first'); return }
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ solution_code: code, reply_text: reply }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || 'Submission failed'); return }
      // API returns { submission: {...}, updated_scores: {...} | null }
      setSubmission(data.submission)
      setUpdatedScores(data.updated_scores)
      setSubmitted(true)
      if (onSubmitted) onSubmitted(data.submission)
    } catch {
      setSubmitError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ------------------------------------------------------------------ */}
      {/* EMAIL CARD                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-6 mt-6 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden shrink-0">
        {/* Email header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <div className="flex items-start justify-between gap-4">
            {/* Sender */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${char.color} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                {char.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{char.name}</p>
                <p className="text-xs text-neutral-500">{char.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {task.deadline && (
                <span className="text-xs text-amber-400">
                  Due {new Date(task.deadline).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              )}
              <StatusBadge status={task.status} />
            </div>
          </div>
          <div className="mt-3 ml-11">
            <p className="text-base font-semibold text-white">{task.subject}</p>
            <p className="text-xs text-neutral-600 mt-0.5">
              {new Date(task.created_at).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Email body */}
        <div className="px-6 py-5 ml-11">
          {renderEmailBody(task.email_body)}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* WORKSPACE — editor + test runner                                    */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={codeSnippetRef}
        className="mx-6 mt-4 rounded-xl overflow-hidden border border-neutral-800 shrink-0"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {/* Workspace header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Workspace
          </span>
          {submitted && (
            <span className="text-xs text-blue-400">Solution submitted</span>
          )}
        </div>

        {/* Split panel */}
        <div className="flex" style={{ height: '380px' }}>
          {/* Left — code editor */}
          <div className="flex-1 border-r border-neutral-800 overflow-hidden flex flex-col">
            <div className="px-3 py-1.5 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-600 font-mono">solution.{getLangExt(task)}</span>
              <span className="text-[11px] text-neutral-700">editor</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {/* key=task.id remounts the editor when the task changes */}
              <CodeEditor
                key={task.id}
                initialCode={task.code_snippet || ''}
                onChange={setCode}
                language={detectLanguage(task)}
              />
            </div>
          </div>

          {/* Right — test runner */}
          <div className="w-72 flex flex-col shrink-0">
            <div className="px-3 py-1.5 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-600">tests</span>
              <button
                onClick={handleRunTests}
                disabled={running || submitted}
                className="text-[11px] font-medium bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-white px-2.5 py-1 rounded transition-colors"
              >
                {running ? 'Running…' : '▶ Run Tests'}
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto p-3 font-mono text-xs"
              style={{ backgroundColor: '#0a0a0a' }}
            >
              <TestOutput output={testOutput} running={running} />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* REPLY COMPOSER                                                       */}
      {/* ------------------------------------------------------------------ */}
      {!submitted ? (
        <form
          onSubmit={handleSend}
          className="mx-6 mt-4 mb-6 border border-neutral-800 rounded-xl overflow-hidden shrink-0"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          {/* Composer header */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <p className="text-xs font-medium text-neutral-300">Reply to {char.name}</p>
            <p className="text-xs text-neutral-600 mt-0.5">Re: {task.subject}</p>
          </div>

          {/* Reply textarea */}
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={`Hi ${char.name.split(' ')[0]},\n\nI've taken a look and made the following changes…`}
            rows={5}
            className="w-full bg-transparent px-4 py-3 text-sm text-neutral-300 placeholder-neutral-700 focus:outline-none resize-none border-b border-neutral-800"
          />

          {/* Attachment notice + send button */}
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-neutral-600 italic">
              Your code fix will be attached automatically from the editor above.
            </p>
            <div className="flex items-center gap-3">
              {submitError && (
                <span className="text-xs text-red-400">{submitError}</span>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="text-sm font-medium bg-white text-neutral-950 rounded-lg px-4 py-1.5 hover:bg-neutral-200 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? 'Sending…' : 'Send Reply →'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Post-submission: AI feedback */
        <div className="mx-6 mt-4 mb-6 border border-neutral-800 rounded-xl overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs font-medium text-neutral-300">Reply sent · AI Feedback</p>
          </div>
          <div className="px-5 py-4 space-y-5">
            {submission ? (
              <MarkdownText text={submission.ai_feedback} />
            ) : (
              <p className="text-xs text-neutral-500">
                This task was previously submitted.
              </p>
            )}

            {/* Score update — only shown when AI returned real scores */}
            {updatedScores && (
              <ScoreUpdate scores={updatedScores} username={null} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function getLangExt(task) {
  const snippet = task.code_snippet || ''
  if (snippet.includes('def ') || snippet.startsWith('#')) return 'py'
  if (snippet.includes('function') || snippet.includes('=>')) return 'js'
  return 'js'
}

function detectLanguage(task) {
  const snippet = task.code_snippet || ''
  if (snippet.includes('def ') || snippet.startsWith('#') || snippet.includes('import ')) return 'python'
  return 'javascript'
}

function StatusBadge({ status }) {
  const styles = {
    pending:   'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    submitted: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    reviewed:  'bg-green-500/20 text-green-400 border border-green-500/30',
  }
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

function TestOutput({ output, running }) {
  if (running) {
    return (
      <div className="text-neutral-500 space-y-1">
        <p className="text-neutral-600">&gt; Running tests...</p>
        <p className="animate-pulse text-neutral-700">_</p>
      </div>
    )
  }
  if (!output) {
    return <p className="text-neutral-700">&gt; Click "Run Tests" to validate your code.</p>
  }
  if (output.error) {
    return <p className="text-red-400">&gt; Error: {output.error}</p>
  }
  return (
    <div className="space-y-1.5">
      <p className="text-neutral-600">&gt; Running tests...</p>
      {output.results.map((r, i) => (
        <p key={i} className={r.passed ? 'text-green-400' : 'text-red-400'}>
          &gt; Test {i + 1}: {r.passed ? 'PASSED' : 'FAILED'} — {r.test}
          {r.message && <span className="text-neutral-500"> ({r.message})</span>}
        </p>
      ))}
      <p className="text-neutral-500 mt-2 pt-2 border-t border-neutral-900">
        &gt; {output.total} test{output.total !== 1 ? 's' : ''} run.{' '}
        <span className="text-green-400">{output.passed} passed</span>,{' '}
        <span className="text-red-400">{output.failed} failed</span>.
      </p>
    </div>
  )
}

function MarkdownText({ text }) {
  if (!text) return null
  return (
    <div className="space-y-2 text-sm text-neutral-300 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**'))
          return <p key={i} className="font-semibold text-white">{line.slice(2, -2)}</p>
        if (line.startsWith('- '))
          return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>
        if (line.startsWith('*') && line.endsWith('*'))
          return <p key={i} className="italic text-neutral-500 text-xs">{line.slice(1, -1)}</p>
        if (line === '') return <div key={i} className="h-1.5" />
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-white font-medium">{part.slice(2, -2)}</strong>
      : part
  )
}

// Shown after submission when real AI scores were returned.
// Displays all 6 scores as labelled bars so the user sees the impact immediately.
const SCORE_META = [
  { key: 'delivery',      label: 'Delivery',       color: 'bg-blue-500' },
  { key: 'code_quality',  label: 'Code Quality',   color: 'bg-purple-500' },
  { key: 'documentation', label: 'Documentation',  color: 'bg-yellow-500' },
  { key: 'collaboration', label: 'Collaboration',  color: 'bg-green-500' },
  { key: 'testing',       label: 'Testing',        color: 'bg-orange-500' },
  { key: 'communication', label: 'Communication',  color: 'bg-teal-500' },
]

import { Link } from 'react-router-dom'
import { useAuth } from '../App'

function ScoreUpdate({ scores }) {
  const { user } = useAuth()
  return (
    <div className="border-t border-neutral-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-400">Competency profile updated</p>
        {user && (
          <Link
            to={`/profile/${user.username}`}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View profile →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {SCORE_META.map(({ key, label, color }) => {
          const value = Math.round(scores[key] ?? 0)
          return (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-neutral-500">{label}</span>
                <span className="text-[11px] font-medium text-neutral-300 tabular-nums">{value}</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-700`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
