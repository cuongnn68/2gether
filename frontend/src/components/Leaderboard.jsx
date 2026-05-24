import React, { useState, useEffect } from 'react'
import { getLeaderboard } from '../api'
import { useAuth } from '../contexts/AuthContext'

function Avatar({ name, url, size = 'md' }) {
  const sz = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center font-bold`}>
      {name?.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Leaderboard({ group }) {
  const { user } = useAuth()
  const [period, setPeriod] = useState('week')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!group) return
    setLoading(true)
    getLeaderboard(group.id, period)
      .then((res) => setEntries(res.data?.entries || res.data || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [group?.id, period])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-sm border border-violet-100 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-extrabold text-gray-800">🏆 Leaderboard</h2>
        <div className="flex rounded-xl sm:rounded-2xl border border-violet-200 overflow-hidden">
          <button
            onClick={() => setPeriod('week')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors ${
              period === 'week' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-violet-50'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors ${
              period === 'month' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-violet-50'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <div className="text-3xl animate-bounce select-none">⭐</div>
          <p className="text-violet-400 text-sm font-semibold">Loading stars...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <div className="text-3xl select-none">🌸</div>
          <p className="text-sm text-gray-400">No tasks logged yet this {period}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-xl sm:rounded-2xl transition-all ${
                entry.user_id === user?.id
                  ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200'
                  : 'bg-gray-50 border border-gray-100'
              }`}
            >
              <div className="w-7 sm:w-8 text-center text-lg select-none">
                {idx < 3 ? medals[idx] : <span className="text-sm font-bold text-gray-400">{idx + 1}</span>}
              </div>
              <Avatar name={entry.user_name} url={entry.avatar_url} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate text-sm">
                  {entry.user_name}
                  {entry.user_id === user?.id && <span className="text-xs text-violet-400 ml-1">(you ✨)</span>}
                </p>
                <p className="text-xs text-gray-400">{entry.task_count} task{entry.task_count !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">{entry.total_points}</span>
                <span className="text-xs text-gray-400 ml-1">pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
