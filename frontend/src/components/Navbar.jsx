import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Avatar({ name, url, size = 8 }) {
  const sz = `w-${size} h-${size}`
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-sm font-bold`}>
      {name?.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Navbar({ groups, currentGroup, onSelectGroup, onCreateGroup, onJoinGroup }) {
  const { user, logout } = useAuth()
  const [groupOpen, setGroupOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const groupRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) setGroupOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="bg-white/90 backdrop-blur-sm border-b border-violet-100 px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>
        <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
          2Gether
        </span>
      </div>

      {/* Group selector — flex-1 so it takes remaining space */}
      <div className="flex-1 min-w-0 flex items-center">
        <div className="relative w-full" ref={groupRef}>
          <button
            onClick={() => setGroupOpen(o => !o)}
            className="w-full flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-violet-200 rounded-xl hover:bg-violet-50 text-sm font-semibold text-gray-700 transition-colors"
          >
            <span className="truncate min-w-0">{currentGroup ? currentGroup.name : 'Select Group'}</span>
            {currentGroup?.role === 'admin' && (
              <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline">Admin</span>
            )}
            <svg className="w-4 h-4 text-violet-400 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {groupOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 max-w-[calc(100vw-4rem)] bg-white border border-violet-100 rounded-2xl shadow-xl z-50 py-1">
              {groups.length === 0 ? (
                <p className="px-4 py-2 text-sm text-gray-400">No groups yet ✨</p>
              ) : (
                groups.map(g => (
                  <button key={g.id} onClick={() => { onSelectGroup(g); setGroupOpen(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-violet-50 transition-colors ${currentGroup?.id === g.id ? 'bg-violet-50 text-violet-700' : 'text-gray-700'}`}>
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{g.name}</p>
                      <p className="text-xs text-gray-400">{g.role}</p>
                    </div>
                    {currentGroup?.id === g.id && (
                      <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
              <div className="border-t border-violet-100 mt-1 pt-1">
                <button onClick={() => { onCreateGroup(); setGroupOpen(false) }}
                  className="w-full px-4 py-2.5 text-sm text-left text-violet-600 hover:bg-violet-50 font-semibold transition-colors">
                  ✨ Create Group
                </button>
                <button onClick={() => { onJoinGroup(); setGroupOpen(false) }}
                  className="w-full px-4 py-2.5 text-sm text-left text-violet-600 hover:bg-violet-50 font-semibold transition-colors">
                  🌸 Join Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User menu */}
      <div className="relative shrink-0" ref={userRef}>
        <button onClick={() => setUserOpen(o => !o)}
          className="flex items-center gap-1.5 hover:bg-violet-50 rounded-xl px-1.5 sm:px-2 py-1 transition-colors">
          <Avatar name={user?.name} url={user?.avatar_url} />
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {userOpen && (
          <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-violet-100 rounded-2xl shadow-xl z-50 py-1">
            <div className="px-4 py-2.5 border-b border-violet-100">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={() => { logout(); setUserOpen(false) }}
              className="w-full px-4 py-2.5 text-sm text-left text-red-500 hover:bg-red-50 font-semibold transition-colors">
              Sign Out 👋
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
