import React, { useState, useEffect, useCallback } from 'react'
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths,
  eachDayOfInterval, isSameDay, isToday, isSameMonth,
} from 'date-fns'
import { getLogs, deleteLog } from '../api'
import { useAuth } from '../contexts/AuthContext'
import LogTaskModal from './LogTaskModal'

function Avatar({ name, url, cls = 'w-5 h-5 text-xs' }) {
  if (url) return <img src={url} alt={name} className={`${cls} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center font-bold shrink-0`}>
      {name?.charAt(0)}
    </div>
  )
}

// Compact card — desktop week columns only
function TaskCard({ log, onDelete, isOwn, isAdmin }) {
  const canDelete = isOwn || isAdmin
  return (
    <div className="group flex items-start gap-1 p-1.5 rounded-xl bg-white border border-violet-100 shadow-sm hover:border-violet-300 transition-all">
      <Avatar name={log.user_name} url={log.user_avatar_url} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-800 truncate leading-tight">{log.task_type_name}</p>
        <span className="text-xs font-extrabold text-violet-500">+{log.task_type_points}</span>
      </div>
      {canDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(log.id) }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Full-size row — mobile week view + day detail sheet
function LogRow({ log, onDelete, isOwn, isAdmin }) {
  const canDelete = isOwn || isAdmin

  const handleDelete = async () => {
    if (!confirm('Delete this log?')) return
    await onDelete(log.id)
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Avatar name={log.user_name} url={log.user_avatar_url} cls="w-8 h-8 text-sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{log.task_type_name}</p>
        <p className="text-xs text-gray-400">
          {log.user_name.split(' ')[0]} · {format(new Date(log.completed_at), 'HH:mm')}
        </p>
      </div>
      <span className="text-sm font-extrabold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent shrink-0">
        +{log.task_type_points}
      </span>
      {canDelete && (
        <button onClick={handleDelete}
          className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Day detail bottom sheet (month view day tap)
function DayDetailModal({ day, logs, group, user, onDelete, onLogTask, onClose }) {
  const dayLogs = logs.filter(l => isSameDay(new Date(l.completed_at), day))
  const isAdmin = group.role === 'admin'
  const today = isToday(day)
  const totalPoints = dayLogs.reduce((sum, l) => sum + l.task_type_points, 0)

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-40">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col border border-violet-100">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-start justify-between px-5 py-3 border-b border-violet-100 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-gray-800">
              {format(day, 'EEEE')}{today && ' ✨'}
            </h2>
            <p className="text-sm text-violet-500 font-semibold">{format(day, 'MMMM d, yyyy')}</p>
            {dayLogs.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {dayLogs.length} {dayLogs.length === 1 ? 'activity' : 'activities'} · {totalPoints} pts total
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="text-gray-300 hover:text-red-400 p-1 rounded-xl hover:bg-red-50 transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {dayLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="text-4xl select-none">🌸</div>
              <p className="text-gray-400 text-sm font-semibold">No activities yet</p>
              <p className="text-gray-300 text-xs">Tap the button below to log one!</p>
            </div>
          ) : (
            <div className="divide-y divide-violet-50">
              {dayLogs.map(log => (
                <LogRow key={log.id} log={log} onDelete={onDelete}
                  isOwn={log.user_id === user?.id} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-violet-100 shrink-0">
          <button onClick={() => onLogTask(day)}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-md text-sm">
            + Log Task ✨
          </button>
        </div>
      </div>
    </div>
  )
}

function WeekView({ group, currentDate, logs, onDelete, onLogTask, user }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) })
  const isAdmin = group.role === 'admin'

  return (
    <>
      {/* ── Mobile: vertical day cards ── */}
      <div className="sm:hidden flex flex-col gap-2">
        {days.map(day => {
          const dayLogs = logs.filter(l => isSameDay(new Date(l.completed_at), day))
          const today = isToday(day)
          return (
            <div key={day.toISOString()}
              className={`rounded-2xl border overflow-hidden ${
                today ? 'border-violet-300 shadow-sm' : 'border-violet-100'
              }`}>
              {/* Day header row */}
              <div className={`flex items-center justify-between px-3 py-2 ${today ? 'bg-violet-50' : 'bg-gray-50/60'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase w-7">{format(day, 'EEE')}</span>
                  <span className={`text-xl font-extrabold leading-none ${today ? 'text-violet-500' : 'text-gray-800'}`}>
                    {format(day, 'd')}
                  </span>
                  {today && <span className="text-base leading-none">✨</span>}
                  {dayLogs.length > 0 && (
                    <span className="text-xs text-gray-400 font-semibold">
                      {dayLogs.length} {dayLogs.length === 1 ? 'entry' : 'entries'}
                    </span>
                  )}
                </div>
                <button onClick={() => onLogTask(day)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-violet-500 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors bg-white">
                  + Log
                </button>
              </div>

              {/* Log rows */}
              {dayLogs.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-300 font-medium italic">No activities</p>
              ) : (
                <div className="divide-y divide-violet-50 bg-white">
                  {dayLogs.map(log => (
                    <LogRow key={log.id} log={log} onDelete={onDelete}
                      isOwn={log.user_id === user?.id} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Desktop: 7-column grid ── */}
      <div className="hidden sm:grid grid-cols-7 gap-1 min-h-96">
        {days.map(day => {
          const dayLogs = logs.filter(l => isSameDay(new Date(l.completed_at), day))
          const today = isToday(day)
          return (
            <div key={day.toISOString()}
              className={`rounded-2xl border flex flex-col transition-all ${
                today
                  ? 'border-violet-300 bg-gradient-to-b from-violet-50 to-white shadow-sm'
                  : 'border-violet-100 bg-white/60'
              }`}>
              <div className={`text-center pt-2 pb-1.5 border-b ${today ? 'border-violet-200' : 'border-violet-50'}`}>
                <p className="text-xs font-bold text-gray-400 uppercase leading-none">{format(day, 'EEE')}</p>
                <p className={`text-sm font-extrabold mt-0.5 leading-none ${today ? 'text-violet-500' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </p>
                {today && <p className="text-xs leading-none mt-0.5">✨</p>}
              </div>
              <div className="flex-1 p-1 space-y-0.5 overflow-y-auto">
                {dayLogs.map(log => (
                  <TaskCard key={log.id} log={log} onDelete={onDelete}
                    isOwn={log.user_id === user?.id} isAdmin={isAdmin} />
                ))}
              </div>
              <div className="p-1 border-t border-violet-50">
                <button onClick={() => onLogTask(day)}
                  className="w-full text-xs text-gray-300 hover:text-violet-500 py-1 hover:bg-violet-50 rounded-lg transition-colors font-semibold">
                  + Log
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function MonthView({ currentDate, logs, onShowDay }) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {[['M','Mon'],['T','Tue'],['W','Wed'],['T','Thu'],['F','Fri'],['S','Sat'],['S','Sun']].map(([short, full], i) => (
          <div key={i} className="text-center py-1">
            <span className="sm:hidden text-xs font-bold text-violet-300">{short}</span>
            <span className="hidden sm:inline text-xs font-bold text-violet-300">{full}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map(day => {
              const dayLogs = logs.filter(l => isSameDay(new Date(l.completed_at), day))
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentDate)
              return (
                <div key={day.toISOString()}
                  onClick={() => onShowDay(day)}
                  className={`min-h-12 sm:min-h-20 rounded-xl sm:rounded-2xl border p-1 cursor-pointer hover:border-violet-300 transition-all ${
                    today
                      ? 'border-violet-400 bg-gradient-to-b from-violet-50 to-white shadow-sm'
                      : inMonth
                      ? 'border-violet-100 bg-white/70 hover:bg-violet-50/50'
                      : 'border-violet-50 bg-white/30'
                  }`}
                >
                  <p className={`text-xs font-extrabold leading-none ${
                    today ? 'text-violet-500' : inMonth ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </p>
                  {dayLogs.length > 0 && (
                    <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                      {dayLogs.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      ))}
                      {dayLogs.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />}
                    </div>
                  )}
                  <div className="hidden sm:block space-y-0.5 mt-1">
                    {dayLogs.slice(0, 3).map(log => (
                      <div key={log.id} className="text-xs truncate px-1 py-0.5 rounded-lg bg-violet-100 text-violet-700 font-bold">
                        {log.task_type_name}
                      </div>
                    ))}
                    {dayLogs.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1">+{dayLogs.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CalendarView({ group }) {
  const { user } = useAuth()
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [dayDetail, setDayDetail] = useState(null)
  const [logModal, setLogModal] = useState(null)

  const fetchLogs = useCallback(async () => {
    if (!group) return
    setLoading(true)
    try {
      let start, end
      if (view === 'week') {
        start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      } else {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        start = format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        end = format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      }
      const res = await getLogs(group.id, start, end)
      setLogs(res.data || [])
    } catch (e) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [group?.id, view, currentDate])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleDelete = async (logId) => {
    try {
      await deleteLog(group.id, logId)
      setLogs(l => l.filter(x => x.id !== logId))
    } catch (e) {
      alert('Failed to delete log')
    }
  }

  const prev = () => {
    if (view === 'week') setCurrentDate(d => subWeeks(d, 1))
    else setCurrentDate(d => subMonths(d, 1))
  }
  const next = () => {
    if (view === 'week') setCurrentDate(d => addWeeks(d, 1))
    else setCurrentDate(d => addMonths(d, 1))
  }
  const goToday = () => setCurrentDate(new Date())

  const title = view === 'week'
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`
    : format(currentDate, 'MMMM yyyy')

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-sm border border-violet-100 p-3 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={prev} className="p-1.5 rounded-xl hover:bg-violet-50 transition-colors">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-sm sm:text-base font-extrabold text-gray-800 text-center min-w-0 flex-1 sm:flex-none sm:min-w-36">
            {title}
          </h2>
          <button onClick={next} className="p-1.5 rounded-xl hover:bg-violet-50 transition-colors">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={goToday} className="px-2.5 py-1 text-xs border-2 border-violet-200 text-violet-500 rounded-xl hover:bg-violet-50 font-bold transition-colors">
            Today
          </button>
          <div className="flex sm:hidden rounded-xl border border-violet-200 overflow-hidden ml-auto">
            <button onClick={() => setView('week')}
              className={`px-2.5 py-1 text-xs font-bold transition-colors ${view === 'week' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-white text-gray-500'}`}>
              Wk
            </button>
            <button onClick={() => setView('month')}
              className={`px-2.5 py-1 text-xs font-bold transition-colors ${view === 'month' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-white text-gray-500'}`}>
              Mo
            </button>
          </div>
        </div>
        <div className="hidden sm:flex rounded-2xl border border-violet-200 overflow-hidden">
          <button onClick={() => setView('week')}
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${view === 'week' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-violet-50'}`}>
            Week
          </button>
          <button onClick={() => setView('month')}
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${view === 'month' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-violet-50'}`}>
            Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <div className="text-3xl animate-bounce select-none">🌸</div>
          <p className="text-violet-400 text-sm font-semibold">Loading...</p>
        </div>
      ) : view === 'week' ? (
        <WeekView group={group} currentDate={currentDate} logs={logs}
          onDelete={handleDelete} onLogTask={setLogModal} user={user} />
      ) : (
        <MonthView currentDate={currentDate} logs={logs} onShowDay={setDayDetail} />
      )}

      {dayDetail && (
        <DayDetailModal
          day={dayDetail}
          logs={logs}
          group={group}
          user={user}
          onDelete={handleDelete}
          onLogTask={(day) => setLogModal(day)}
          onClose={() => setDayDetail(null)}
        />
      )}

      {logModal && (
        <LogTaskModal group={group} date={logModal}
          onClose={() => setLogModal(null)}
          onLogged={() => { fetchLogs(); setLogModal(null) }} />
      )}
    </div>
  )
}
