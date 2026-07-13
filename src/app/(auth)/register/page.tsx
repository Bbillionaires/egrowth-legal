'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Email confirmation required — no session yet
    if (!data.session) {
      setSubmitted(true)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            e<span className="text-brand-500">Growth</span> Legal
          </h1>
          <div className="card">
            <p className="text-sm text-gray-600">
              Check <strong>{email}</strong> for a confirmation link to finish creating your account.
            </p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            <Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            e<span className="text-brand-500">Growth</span> Legal
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="input"
                placeholder="Jane Smith"
                required
              />
            </div>
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
            <div>
              <label className="label">Phone (optional)</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
                placeholder="(904) 555-0100"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
