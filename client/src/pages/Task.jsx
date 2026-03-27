// pages/Task.jsx
// Standalone full-page task view for direct URL access (/task/:id).
// Uses the same TaskWorkspace component as the Dashboard panel.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TaskWorkspace from '../components/TaskWorkspace'

export default function Task() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)

  useEffect(() => {
    fetch(`/api/tasks/${id}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setTask)
      .catch(() => navigate('/dashboard'))
  }, [id])

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="w-4 h-4 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
      <header className="flex items-center gap-3 px-6 py-4 border-b border-neutral-800 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ← Inbox
        </button>
        <span className="text-neutral-800">/</span>
        <span className="text-xs text-neutral-500 truncate">{task.subject}</span>
      </header>
      <div className="flex-1 overflow-hidden">
        <TaskWorkspace task={task} onSubmitted={() => {}} />
      </div>
    </div>
  )
}
