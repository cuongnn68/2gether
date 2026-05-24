import React, { useState, useEffect } from 'react'
import { getTaskTypes, createTaskType, updateTaskType, deleteTaskType, getGroup, updateGroup, refreshJoinCode, kickMember } from '../api'
import { useAuth } from '../contexts/AuthContext'

function TaskTypeRow({ task, groupId, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: task.name, description: task.description, points: task.points })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await updateTaskType(groupId, task.id, { ...form, active: task.active })
      onUpdated(res.data)
      setEditing(false)
    } catch (e) {
      alert('Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      const res = await updateTaskType(groupId, task.id, {
        name: task.name, description: task.description, points: task.points, active: !task.active
      })
      onUpdated(res.data)
    } catch (e) {
      alert('Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.name}"?`)) return
    try {
      await deleteTaskType(groupId, task.id)
      onDeleted(task.id)
    } catch (e) {
      alert('Failed to delete task')
    }
  }

  if (editing) {
    return (
      <div className="p-3 bg-violet-50 rounded-2xl border-2 border-violet-200">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
            className="px-2 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="Task name" />
          <input type="number" value={form.points} onChange={e => setForm(f => ({...f, points: parseInt(e.target.value) || 1}))}
            className="px-2 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="Points" min={1} />
        </div>
        <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
          className="w-full px-2 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-semibold mb-2 focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="Description (optional)" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={loading}
            className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
            Save ✨
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-bold hover:bg-violet-50 text-gray-600">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 p-3 rounded-2xl border-2 transition-all ${task.active ? 'border-violet-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-gray-800 text-sm">{task.name}</span>
          <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-bold">{task.points} pts ⭐</span>
          {!task.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">inactive</span>}
        </div>
        {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={handleToggleActive}
          title={task.active ? 'Deactivate' : 'Activate'}
          className="p-1.5 text-gray-300 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
          {task.active ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          )}
        </button>
        <button onClick={() => setEditing(true)} className="p-1.5 text-gray-300 hover:text-violet-500 rounded-xl hover:bg-violet-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={handleDelete} className="p-1.5 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function AdminPanel({ group: initialGroup }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('tasks')
  const [taskTypes, setTaskTypes] = useState([])
  const [group, setGroup] = useState(initialGroup)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', description: '', points: 1 })
  const [addLoading, setAddLoading] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ name: group.name, description: group.description })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    getTaskTypes(group.id, true).then(r => setTaskTypes(r.data || []))
  }, [group.id])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTask.name.trim()) return
    setAddLoading(true)
    try {
      const res = await createTaskType(group.id, newTask)
      setTaskTypes(t => [...t, res.data])
      setNewTask({ name: '', description: '', points: 1 })
      setShowAddForm(false)
    } catch (e) {
      alert('Failed to add task')
    } finally {
      setAddLoading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSettingsSaving(true)
    try {
      const res = await updateGroup(group.id, settingsForm)
      setGroup(g => ({...g, ...res.data}))
    } catch (e) {
      alert('Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleRefreshCode = async () => {
    if (!confirm('Refresh the join code? The old code will stop working immediately.')) return
    setRefreshing(true)
    try {
      const res = await refreshJoinCode(group.id)
      setGroup(g => ({...g, join_code: res.data.join_code}))
      setCopied(false)
    } catch (e) {
      alert('Failed to refresh code')
    } finally {
      setRefreshing(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(group.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-sm border border-violet-100 p-4 sm:p-5">
      <h2 className="text-base sm:text-lg font-extrabold text-gray-800 mb-4">⚙️ Admin Panel</h2>

      <div className="flex gap-0.5 mb-5 border-b border-violet-100">
        {['tasks', 'settings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors capitalize ${
              tab === t ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {t === 'tasks' ? '🌸 Task Types' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="space-y-2">
          {taskTypes.map(task => (
            <TaskTypeRow key={task.id} task={task} groupId={group.id}
              onUpdated={updated => setTaskTypes(ts => ts.map(t => t.id === updated.id ? updated : t))}
              onDeleted={id => setTaskTypes(ts => ts.filter(t => t.id !== id))} />
          ))}

          {showAddForm ? (
            <form onSubmit={handleAddTask} className="p-3 bg-purple-50 rounded-2xl border-2 border-purple-200">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newTask.name} onChange={e => setNewTask(f => ({...f, name: e.target.value}))}
                  className="px-2 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="Task name *" autoFocus />
                <input type="number" value={newTask.points} onChange={e => setNewTask(f => ({...f, points: parseInt(e.target.value) || 1}))}
                  className="px-2 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="Points" min={1} />
              </div>
              <input value={newTask.description} onChange={e => setNewTask(f => ({...f, description: e.target.value}))}
                className="w-full px-2 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-semibold mb-2 focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="Description (optional)" />
              <div className="flex gap-2">
                <button type="submit" disabled={addLoading || !newTask.name.trim()}
                  className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
                  Add ✨
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 border-2 border-violet-200 rounded-xl text-sm font-bold hover:bg-violet-50 text-gray-600">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full p-2.5 border-2 border-dashed border-violet-200 rounded-2xl text-sm text-violet-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 transition-colors font-bold">
              + Add Task Type 🌸
            </button>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-5">
          <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border-2 border-violet-100">
            <p className="text-sm font-bold text-gray-700 mb-2">✨ Magic Join Code</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
                {group.join_code}
              </span>
              <button onClick={copyCode}
                className="px-3 py-1.5 text-sm border-2 border-violet-200 rounded-xl hover:bg-violet-50 transition-colors font-bold text-violet-500">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              <button onClick={handleRefreshCode} disabled={refreshing}
                className="px-3 py-1.5 text-sm border-2 border-orange-200 rounded-xl hover:bg-orange-50 transition-colors font-bold text-orange-500 disabled:opacity-50">
                {refreshing ? 'Refreshing...' : '↻ New Code'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 font-semibold">Share this with people you want to invite 💕</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Group Name</label>
              <input value={settingsForm.name} onChange={e => setSettingsForm(f => ({...f, name: e.target.value}))}
                className="w-full px-3 py-2.5 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm font-semibold text-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
              <textarea value={settingsForm.description} onChange={e => setSettingsForm(f => ({...f, description: e.target.value}))}
                rows={2} className="w-full px-3 py-2.5 border-2 border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm font-semibold text-gray-700 resize-none" />
            </div>
            <button type="submit" disabled={settingsSaving}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md">
              {settingsSaving ? 'Saving... 🌸' : 'Save Settings ✨'}
            </button>
          </form>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">💕 Members</p>
            <MembersList groupId={group.id} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  )
}

function MembersList({ groupId, currentUserId }) {
  const [members, setMembers] = useState([])
  const [kicking, setKicking] = useState(null)

  useEffect(() => {
    getGroup(groupId).then(r => setMembers(r.data?.members || []))
  }, [groupId])

  const handleKick = async (m) => {
    if (!confirm(`Remove ${m.user_name} from the group?`)) return
    setKicking(m.user_id)
    try {
      await kickMember(groupId, m.user_id)
      setMembers(prev => prev.filter(x => x.user_id !== m.user_id))
    } catch (e) {
      alert('Failed to remove member')
    } finally {
      setKicking(null)
    }
  }

  return (
    <div className="space-y-2">
      {members.map(m => (
        <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
          {m.avatar_url ? (
            <img src={m.avatar_url} alt={m.user_name} className="w-8 h-8 rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {m.user_name?.charAt(0)}
            </div>
          )}
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{m.user_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${m.role === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
            {m.role}
          </span>
          {m.user_id !== currentUserId && (
            <button
              onClick={() => handleKick(m)}
              disabled={kicking === m.user_id}
              title="Remove from group"
              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h8m5-4l2 2m0 0l2 2m-2-2l2-2m-2 2l-2 2" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
