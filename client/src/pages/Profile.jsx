// pages/Profile.jsx
// Public developer profile page. No auth required.
// Sections: Header → Languages → Competency → Recent Activity → Share

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const LEVEL_LABELS = {
  1: 'Graduate Developer',
  2: 'Junior Developer',
  3: 'Associate Developer',
  4: 'Mid-Level Developer',
  5: 'Senior Developer',
}

const COMPETENCY_META = [
  { key: 'delivery',       label: 'Delivery',       color: 'bg-blue-500',    desc: 'Ships tasks on time and meets deadlines.' },
  { key: 'code_quality',   label: 'Code Quality',   color: 'bg-purple-500',  desc: 'Writes clean, correct, and maintainable code.' },
  { key: 'documentation',  label: 'Documentation',  color: 'bg-yellow-500',  desc: 'Adds meaningful comments and docstrings.' },
  { key: 'collaboration',  label: 'Collaboration',  color: 'bg-green-500',   desc: 'Follows the brief and asks good clarifying questions.' },
  { key: 'testing',        label: 'Testing',        color: 'bg-orange-500',  desc: 'Includes tests and handles edge cases.' },
  { key: 'communication',  label: 'Communication',  color: 'bg-teal-500',    desc: 'Writes clear, professional replies and updates.' },
]

const CHAR_META = {
  manager: { name: 'Sarah Chen',  role: 'Engineering Manager', initials: 'SC', color: 'bg-blue-700' },
  qa:      { name: 'Marco Rossi', role: 'QA Lead',             initials: 'MR', color: 'bg-yellow-700' },
  pm:      { name: 'Priya Patel', role: 'Product Manager',     initials: 'PP', color: 'bg-green-700' },
}

// Derive a stable avatar background from username
function avatarColor(username) {
  const palette = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-orange-600', 'bg-pink-600', 'bg-teal-600']
  return palette[(username?.charCodeAt(0) || 0) % palette.length]
}

// Language level based on task count
function langLevel(count) {
  if (count >= 15) return { label: 'Advanced',     progress: 100, next: null }
  if (count >= 5)  return { label: 'Intermediate', progress: Math.round(((count - 5) / 10) * 100), next: 15 }
  return             { label: 'Beginner',      progress: Math.round((count / 5) * 100),  next: 5 }
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export default function Profile() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then(res => { if (res.status === 404) { setNotFound(true); return null } return res.json() })
      .then(data => { if (data) setProfile(data) })
  }, [username])

  if (notFound) return (
    <Screen><p className="text-neutral-500 text-sm">User not found.</p>
      <Link to="/login" className="text-xs text-neutral-600 hover:text-neutral-400 mt-2 transition-colors">← codelogged</Link>
    </Screen>
  )

  if (!profile) return (
    <Screen><div className="w-4 h-4 border-2 border-neutral-700 border-t-white rounded-full animate-spin" /></Screen>
  )

  const memberSince = new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const levelLabel = LEVEL_LABELS[profile.level] || `Level ${profile.level}`
  const lang = langLevel(profile.tasks_completed)
  const profileUrl = `codelogged.dev/profile/${profile.username}`

  function copyUrl() {
    navigator.clipboard.writeText(profileUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="min-h-screen text-neutral-300" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* Back link */}
        <Link to="/login" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
          ← codelogged
        </Link>

        {/* ============================================================== */}
        {/* SECTION 1 — HEADER                                              */}
        {/* ============================================================== */}
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className={`w-14 h-14 rounded-full ${avatarColor(profile.username)} flex items-center justify-center text-lg font-bold text-white shrink-0`}>
            {profile.username.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">{profile.username}</h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {profile.language} developer · Member since {memberSince}
                </p>
              </div>
              {/* Level badge */}
              <div className="text-right shrink-0">
                <span className="text-xs font-medium text-neutral-500 bg-neutral-800 border border-neutral-700 px-2.5 py-1 rounded-full">
                  Level {profile.level} — {levelLabel}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-5 mt-3">
              <Stat value={profile.tasks_completed} label="tasks completed" />
              <div className="w-px h-4 bg-neutral-800" />
              <Stat value={`${profile.streak}d`} label="streak" />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION 2 — LANGUAGES                                           */}
        {/* ============================================================== */}
        <Section title="Languages">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Language colour dot */}
                <div className={`w-3 h-3 rounded-full ${langDotColor(profile.language)} shrink-0 mt-0.5`} />
                <div>
                  <p className="text-sm font-medium text-white">{profile.language}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {lang.label} · {profile.tasks_completed} task{profile.tasks_completed !== 1 ? 's' : ''} completed
                  </p>
                </div>
              </div>
              {lang.next && (
                <p className="text-xs text-neutral-600 shrink-0">{lang.next - profile.tasks_completed} to {nextLangLevel(profile.tasks_completed)}</p>
              )}
            </div>
            <div className="mt-3 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${lang.progress}%` }}
              />
            </div>
          </div>
        </Section>

        {/* ============================================================== */}
        {/* SECTION 3 — COMPETENCY SCORES                                   */}
        {/* ============================================================== */}
        <Section title="Competency profile">
          {profile.competency ? (
            <div className="space-y-4">
              {COMPETENCY_META.map(({ key, label, color, desc }) => {
                const value = Math.round(profile.competency[key] ?? 0)
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-neutral-300">{label}</span>
                      <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{desc}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">No submissions yet — scores appear after completing tasks.</p>
          )}
        </Section>

        {/* ============================================================== */}
        {/* SECTION 4 — RECENT ACTIVITY                                     */}
        {/* ============================================================== */}
        <Section title="Recent activity">
          {profile.recent_tasks && profile.recent_tasks.length > 0 ? (
            <div className="divide-y divide-neutral-800/60">
              {profile.recent_tasks.map(task => {
                const char = CHAR_META[task.character] || { name: task.character, role: '', initials: '?', color: 'bg-neutral-700' }
                const submittedAt = task.submitted_at ? new Date(task.submitted_at) : null
                const deadline = task.deadline ? new Date(task.deadline) : null
                const onTime = submittedAt && deadline ? submittedAt <= deadline : null

                return (
                  <div key={task.id} className="flex items-start gap-3 py-3">
                    {/* Sender avatar */}
                    <div className={`w-7 h-7 rounded-full ${char.color} flex items-center justify-center text-[10px] font-semibold text-white shrink-0 mt-0.5`}>
                      {char.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500">{char.name} · {char.role}</p>
                      <p className="text-sm text-neutral-300 truncate mt-0.5">{task.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <LangBadge lang={profile.language} />
                        {onTime !== null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${onTime ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                            {onTime ? 'on time' : 'late'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {submittedAt && (
                        <p className="text-[11px] text-neutral-600">
                          {submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">No completed tasks yet.</p>
          )}
        </Section>

        {/* ============================================================== */}
        {/* SECTION 5 — SHARE BAR                                           */}
        {/* ============================================================== */}
        <div className="border border-neutral-800 rounded-xl p-5">
          <p className="text-xs font-medium text-neutral-400 mb-1">Share your profile</p>
          <p className="text-xs text-neutral-600 mb-3">
            Share this with employers as evidence of your engineering work habits.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono truncate">
              {profileUrl}
            </code>
            <button
              onClick={copyUrl}
              className="text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// Small reusable pieces
// -------------------------------------------------------------------------

function Screen({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2" style={{ backgroundColor: '#0a0a0a' }}>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <span className="text-base font-semibold text-white">{value}</span>
      <span className="text-xs text-neutral-600 ml-1.5">{label}</span>
    </div>
  )
}

function LangBadge({ lang }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
      {lang}
    </span>
  )
}

function langDotColor(lang) {
  const map = {
    Python: 'bg-blue-400',
    JavaScript: 'bg-yellow-400',
    TypeScript: 'bg-blue-500',
    Go: 'bg-teal-400',
    Rust: 'bg-orange-400',
    Java: 'bg-red-400',
    'C#': 'bg-purple-400',
    Ruby: 'bg-red-500',
  }
  return map[lang] || 'bg-neutral-500'
}

function nextLangLevel(count) {
  if (count < 5) return 'Intermediate'
  if (count < 15) return 'Advanced'
  return 'Max level'
}
