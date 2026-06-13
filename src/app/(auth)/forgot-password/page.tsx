'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        {sent ? (
          <div className="card text-center">
            <p className="text-sm text-green-700 font-medium mb-2">Check your email</p>
            <p className="text-sm text-gray-500">We sent a password reset link to <strong>{email}</strong>.</p>
            <Link href="/login" className="btn-primary mt-4 w-full block text-center">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@egrowth.com"
                required
                className="input"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !email} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <p className="text-xs text-center text-gray-400">
              <Link href="/login" className="hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
