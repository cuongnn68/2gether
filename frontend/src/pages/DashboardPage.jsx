import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import CalendarView from '../components/CalendarView'
import Leaderboard from '../components/Leaderboard'
import AdminPanel from '../components/AdminPanel'
import { CreateGroupModal, JoinGroupModal } from '../components/GroupModals'
import { getMyGroups } from '../api'

function EmptyState({ onCreateGroup, onJoinGroup }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
      <div className="text-6xl mb-5 select-none">🌸</div>
      <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
        <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-extrabold text-gray-800 mb-2">No groups yet ✨</h2>
      <p className="text-gray-400 mb-8 max-w-xs text-sm leading-relaxed">
        Create a cozy group for your team or family, or join one with a magic code!
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button onClick={onCreateGroup}
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-md text-sm">
          ✨ Create Group
        </button>
        <button onClick={onJoinGroup}
          className="px-6 py-3 border-2 border-violet-200 text-violet-500 rounded-2xl font-bold hover:bg-violet-50 transition-colors text-sm">
          🌸 Join Group
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [groups, setGroups] = useState([])
  const [currentGroup, setCurrentGroup] = useState(null)
  const [activeTab, setActiveTab] = useState('calendar')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyGroups()
      .then((res) => {
        const g = res.data || []
        setGroups(g)
        if (g.length > 0) {
          const saved = localStorage.getItem('lastGroupId')
          const found = saved ? g.find(x => x.id === saved) : null
          setCurrentGroup(found || g[0])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelectGroup = (g) => {
    setCurrentGroup(g)
    localStorage.setItem('lastGroupId', g.id)
    setActiveTab('calendar')
  }

  const handleGroupCreated = (g) => {
    setGroups(prev => [g, ...prev])
    setCurrentGroup(g)
    localStorage.setItem('lastGroupId', g.id)
    setActiveTab('admin')
  }

  const handleGroupJoined = (g) => {
    setGroups(prev => {
      if (prev.find(x => x.id === g.id)) return prev
      return [g, ...prev]
    })
    setCurrentGroup(g)
    localStorage.setItem('lastGroupId', g.id)
    setActiveTab('calendar')
  }

  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'leaderboard', label: 'Board', icon: '🏆' },
    ...(currentGroup?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: '⚙️' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex flex-col">
      <Navbar
        groups={groups}
        currentGroup={currentGroup}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={() => setShowCreateModal(true)}
        onJoinGroup={() => setShowJoinModal(true)}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce select-none">🌸</div>
            <p className="text-violet-400 font-bold">Loading your world...</p>
          </div>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState onCreateGroup={() => setShowCreateModal(true)} onJoinGroup={() => setShowJoinModal(true)} />
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6">
          {/* Tab bar */}
          <div className="flex gap-0.5 sm:gap-1 border-b border-violet-100 mb-4 sm:mb-6">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'calendar' && currentGroup && (
            <CalendarView group={currentGroup} />
          )}

          {activeTab === 'leaderboard' && currentGroup && (
            <div className="max-w-xl">
              <Leaderboard group={currentGroup} />
            </div>
          )}

          {activeTab === 'admin' && currentGroup?.role === 'admin' && (
            <div className="max-w-xl">
              <AdminPanel group={currentGroup} />
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleGroupCreated}
        />
      )}
      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onJoined={handleGroupJoined}
        />
      )}
    </div>
  )
}
