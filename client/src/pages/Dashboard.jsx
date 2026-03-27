// pages/Dashboard.jsx
// Main application shell: inbox sidebar on the left, full task workspace on the right.
// Clicking an email row opens the workspace immediately — no intermediate preview.
// Competency scores live on the profile page, not here.

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../App'
import Inbox from '../components/Inbox'
import TaskWorkspace from '../components/TaskWorkspace'

export default function Dashboard() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tasks', { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setTasks(data)
        if (data.length > 0) setSelectedTask(data[0])
      })
  }, [])

  async function generateTask() {
    setGenerating(true)
    const res = await fetch('/api/tasks/generate', {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const task = await res.json()
      setTasks(prev => [task, ...prev])
      setSelectedTask(task)
    }
    setGenerating(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    navigate('/login')
  }

  // After a task is submitted, update it in the task list so the inbox badge changes
  function handleSubmitted(submission) {
    setTasks(prev => prev.map(t =>
      t.id === selectedTask?.id ? { ...t, status: 'submitted' } : t
    ))
    setSelectedTask(prev => prev ? { ...prev, status: 'submitted' } : prev)
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
      {/* ---------------------------------------------------------------- */}
      {/* NAV                                                               */}
      {/* ---------------------------------------------------------------- */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
        <span className="text-sm font-semibold text-white tracking-tight">codelogged</span>
        <div className="flex items-center gap-4">
          {user && (
            <Link
              to={`/profile/${user.username}`}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {user.username} · Lv.{user.level}
            </Link>
          )}
          <button
            onClick={generateTask}
            disabled={generating}
            className="text-xs bg-white text-neutral-950 font-medium rounded-md px-3 py-1.5 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating…' : '+ New task'}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* MAIN LAYOUT                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Inbox sidebar — clean list, no score bars */}
        <aside className="w-72 border-r border-neutral-800 shrink-0 overflow-hidden flex flex-col">
          <Inbox
            tasks={tasks}
            selected={selectedTask}
            onSelect={setSelectedTask}
          />
        </aside>

        {/* Right panel — task workspace or empty state */}
        <main className="flex-1 overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
          {selectedTask ? (
            // key=selectedTask.id remounts TaskWorkspace (and CodeEditor) on task change
            <TaskWorkspace
              key={selectedTask.id}
              task={selectedTask}
              onSubmitted={handleSubmitted}
            />
          ) : (
            <EmptyState onGenerate={generateTask} generating={generating} />
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyState({ onGenerate, generating }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-sm text-neutral-600">Select a task from your inbox</p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="text-xs bg-white text-neutral-950 font-medium rounded-lg px-4 py-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
      >
        {generating ? 'Generating…' : 'Generate first task'}
      </button>
    </div>
  )
}
