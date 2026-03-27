// components/Inbox.jsx
// Email-client inbox panel for the dashboard sidebar.
// Unread (pending) tasks are displayed in bold. Clicking a row selects the task.

const CHAR_AVATARS = {
  manager: 'SC',
  qa: 'MR',
  pm: 'PP',
}

const CHAR_NAMES = {
  manager: 'Sarah Chen',
  qa: 'Marco Rossi',
  pm: 'Priya Patel',
}

export default function Inbox({ tasks, selected, onSelect }) {
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-neutral-600 text-center">
          No tasks yet.<br />Click "+ New task" to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Inbox header */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <p className="text-xs font-medium text-neutral-500">
          Inbox{' '}
          <span className="text-neutral-600">
            ({tasks.filter(t => t.status === 'pending').length} unread)
          </span>
        </p>
      </div>

      {/* Task list */}
      <ul>
        {tasks.map(task => {
          const isSelected = selected?.id === task.id
          const isUnread = task.status === 'pending'

          return (
            <li key={task.id}>
              <button
                onClick={() => onSelect(task)}
                className={[
                  'w-full text-left px-4 py-3 border-b border-neutral-800/50',
                  'hover:bg-neutral-800/50 transition-colors',
                  isSelected ? 'bg-neutral-800' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar bubble */}
                  <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-medium text-neutral-300 shrink-0 mt-0.5">
                    {CHAR_AVATARS[task.character] || '??'}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Sender name + timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-xs truncate ${isUnread ? 'text-white font-semibold' : 'text-neutral-400'}`}>
                        {CHAR_NAMES[task.character] || task.character}
                      </span>
                      <span className="text-[10px] text-neutral-600 shrink-0">
                        {formatRelativeTime(task.created_at)}
                      </span>
                    </div>

                    {/* Subject */}
                    <p className={`text-xs truncate ${isUnread ? 'text-neutral-200 font-medium' : 'text-neutral-500'}`}>
                      {task.subject}
                    </p>

                    {/* Status dot for submitted/reviewed */}
                    {task.status !== 'pending' && (
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded ${
                        task.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {task.status}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Convert ISO timestamp to "2h ago", "3d ago" etc.
function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
