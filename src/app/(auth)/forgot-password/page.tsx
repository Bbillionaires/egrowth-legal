'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            e<span className="text-brand-500">Growth</span> Legal
          </h1>
          <p className="text-sm text-gray-500 mt-1">Reset your password</p>
        </div>

        <div className="card">
          {sent ? (
            <p className="text-sm text-gray-600">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
