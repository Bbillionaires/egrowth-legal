'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase PKCE flow sends ?code= in the URL.
    // Exchange it for a session so updateUser() works.
    const code = searchParams.get('code')
    if (!code) {
      // No code — could be a direct visit or hash-based legacy link.
      // Check if there's already a valid recovery session.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true)
        } else {
          setError('Invalid or expired reset link. Please request a new one.')
        }
      })
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('This reset link has expired or already been used. Please request a new one.')
      } else {
        setReady(true)
        // Clean the code from the URL so a page refresh doesn't re-attempt exchange
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.toString())
      }
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password for your account.</p>
        </div>

        {done ? (
          <div className="card text-center">
            <p className="text-sm text-green-700 font-medium mb-1">Password updated!</p>
            <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
          </div>
        ) : error && !ready ? (
          <div className="card text-center space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <Link href="/forgot-password" className="btn-primary w-full block text-center">
              Request a new link
            </Link>
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !password || !confirm} className="btn-primary w-full">
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        ) : (
          <div className="card text-center">
            <p className="text-sm text-gray-500">Verifying reset link...</p>
          </div>
        )}
      </div>
    </div>
  )
}
