import React, { useState } from 'react'
import { createGroup, joinGroup } from '../api'

function Modal({ title, emoji, onClose, children, footer }) {
  return (
    /* Bottom-sheet on mobile, centered on desktop */
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col border border-violet-100">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-violet-100 shrink-0">
          <h2 className="text-base sm:text-lg font-extrabold text-gray-800">{emoji} {title}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-xl hover:bg-red-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-violet-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await createGroup({ name: name.trim(), description: description.trim() })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Create Group"
      emoji="✨"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-violet-200 rounded-2xl text-gray-600 font-bold hover:bg-violet-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || !name.trim()}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
            {loading ? 'Creating... 🌸' : 'Create ✨'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Group Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dream Team, Family Vibes 🌸"
            className="w-full px-3 py-2.5 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700 font-semibold"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group all about? 💕"
            rows={3}
            className="w-full px-3 py-2.5 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700 font-semibold resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
      </form>
    </Modal>
  )
}

export function JoinGroupModal({ onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await joinGroup(code.trim().toUpperCase())
      onJoined(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Join Group"
      emoji="🌸"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-violet-200 rounded-2xl text-gray-600 font-bold hover:bg-violet-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || code.length !== 6}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
            {loading ? 'Joining... 🌸' : 'Join 🌸'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Magic Join Code ✨</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-3 py-3 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono text-2xl tracking-widest text-center uppercase text-violet-600 font-bold"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1.5 font-semibold text-center">6-character code from the group admin 💕</p>
        </div>
        {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
      </form>
    </Modal>
  )
}
