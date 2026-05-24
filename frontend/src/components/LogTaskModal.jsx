import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getTaskTypes, createLog } from '../api'

export default function LogTaskModal({ group, date, onClose, onLogged }) {
  const [taskTypes, setTaskTypes] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [time, setTime] = useState(format(new Date(), 'HH:mm'))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getTaskTypes(group.id)
      .then((res) => setTaskTypes(res.data || []))
      .catch(() => {})
  }, [group.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTask) return
    setLoading(true)
    setError('')
    try {
      const [hours, minutes] = time.split(':')
      const completedAt = new Date(date)
      completedAt.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      await createLog(group.id, {
        task_type_id: selectedTask.id,
        completed_at: completedAt.toISOString(),
        note: note.trim(),
      })
      onLogged()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log task')
    } finally {
      setLoading(false)
    }
  }

  const cardColors = [
    'bg-violet-50 border-violet-200 text-violet-800',
    'bg-purple-50 border-purple-200 text-purple-800',
    'bg-indigo-50 border-indigo-200 text-indigo-800',
    'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
    'bg-blue-50 border-blue-200 text-blue-800',
    'bg-teal-50 border-teal-200 text-teal-800',
  ]

  return (
    /* Bottom-sheet on mobile, centered dialog on desktop */
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col border border-violet-100">
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-violet-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-800">✨ Log Task</h2>
            <p className="text-xs sm:text-sm text-violet-500 font-semibold">{format(date, 'EEE, MMM d, yyyy')}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-xl hover:bg-red-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Task picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pick a Task 🌸</label>
            {taskTypes.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No tasks configured. Ask an admin to add tasks.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {taskTypes.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTask(t)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${
                      selectedTask?.id === t.id
                        ? 'border-violet-500 bg-violet-50 shadow-sm'
                        : `${cardColors[i % cardColors.length]} border`
                    }`}
                  >
                    <div className="font-bold text-sm leading-snug">{t.name}</div>
                    <div className={`text-xs font-extrabold mt-0.5 ${selectedTask?.id === t.id ? 'text-violet-500' : 'text-purple-500'}`}>
                      {t.points} pts ⭐
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Time 🕐</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="px-3 py-2 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 font-semibold text-gray-700 w-full sm:w-auto"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Note (optional) 💕</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
            />
          </div>

          {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
        </form>

        {/* Footer buttons — always visible, not scrolled away */}
        <div className="flex gap-3 px-5 py-4 border-t border-violet-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-violet-200 rounded-2xl text-gray-600 font-bold hover:bg-violet-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedTask}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
            {loading ? 'Logging... 🌸' : 'Log Task ✨'}
          </button>
        </div>
      </div>
    </div>
  )
}
