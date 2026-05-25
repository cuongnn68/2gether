import axios from 'axios'

// Use ?? so empty string (Docker/nginx proxy) is preserved; fall back only when truly unset
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export const api = axios.create({ baseURL: API_URL, withCredentials: true })

export const getGoogleLoginURL = () => `${API_URL}/api/auth/google/login`
export const getMe = () => api.get('/api/auth/me')
export const logoutAPI = () => api.post('/api/auth/google/logout')

export const getMyGroups = () => api.get('/api/groups')
export const createGroup = (data) => api.post('/api/groups', data)
export const joinGroup = (join_code) => api.post('/api/groups/join', { join_code })
export const getGroup = (id) => api.get(`/api/groups/${id}`)
export const updateGroup = (id, data) => api.put(`/api/groups/${id}`, data)
export const refreshJoinCode = (id) => api.post(`/api/groups/${id}/refresh-code`)
export const kickMember = (groupId, userId) => api.delete(`/api/groups/${groupId}/members/${userId}`)

export const getTaskTypes = (groupId, all = false) =>
  api.get(`/api/groups/${groupId}/task-types`, { params: all ? { all: 'true' } : {} })
export const createTaskType = (groupId, data) => api.post(`/api/groups/${groupId}/task-types`, data)
export const updateTaskType = (groupId, tid, data) => api.put(`/api/groups/${groupId}/task-types/${tid}`, data)
export const deleteTaskType = (groupId, tid) => api.delete(`/api/groups/${groupId}/task-types/${tid}`)

export const getLogs = (groupId, start, end) =>
  api.get(`/api/groups/${groupId}/logs`, { params: { start, end } })
export const createLog = (groupId, data) => api.post(`/api/groups/${groupId}/logs`, data)
export const deleteLog = (groupId, lid) => api.delete(`/api/groups/${groupId}/logs/${lid}`)

export const getLeaderboard = (groupId, period) =>
  api.get(`/api/groups/${groupId}/leaderboard`, { params: { period } })
