import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-16 left-8 sm:left-16 w-32 sm:w-40 h-32 sm:h-40 bg-violet-200 rounded-full opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 right-8 sm:right-16 w-40 sm:w-56 h-40 sm:h-56 bg-purple-200 rounded-full opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-indigo-200 rounded-full opacity-30 blur-2xl pointer-events-none" />

      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md text-center border border-violet-100 relative">
        {/* Floating sparkles */}
        <div className="absolute -top-4 -right-4 text-2xl select-none">✨</div>
        <div className="absolute -top-3 -left-3 text-xl select-none">🌸</div>
        <div className="absolute -bottom-3 -right-3 text-xl select-none">💫</div>

        <div className="mb-7">
          <div className="w-18 h-18 w-[72px] h-[72px] bg-gradient-to-br from-violet-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-200">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
            2Gether
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Track your adventures together ✨</p>
        </div>

        <div className="flex justify-center gap-2 mb-7 text-xl select-none">
          <span>🌟</span><span>🌸</span><span>🌟</span>
        </div>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-violet-200 rounded-2xl text-gray-700 font-semibold hover:bg-violet-50 hover:border-violet-300 transition-all shadow-sm"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs text-gray-400 mt-7">
          By signing in, you agree to share your Google profile info 💕
        </p>
      </div>
    </div>
  )
}
