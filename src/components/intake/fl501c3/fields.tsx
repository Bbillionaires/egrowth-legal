'use client'
import clsx from 'clsx'
import type { ReactNode } from 'react'

// Form inputs for the 501(c)(3) intake. `value === null` means "I don't know";
// `undefined` means not answered yet.

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export function TextInput({ value, onChange, placeholder, type = 'text', error, disabled }: {
  value?: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={clsx('input', error && 'border-red-300')}
    />
  )
}

export function TextArea({ value, onChange, placeholder, maxLength, error }: {
  value?: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; error?: string
}) {
  return (
    <>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={clsx('input min-h-[90px] resize-y', error && 'border-red-300')}
      />
      {maxLength && <p className="text-[11px] text-gray-400 text-right">{(value ?? '').length}/{maxLength}</p>}
    </>
  )
}

export function Select<T extends string>({ value, onChange, options, placeholder = 'Select…', error, disabled }: {
  value?: T | null; onChange: (v: T | undefined) => void; options: { value: T; label: string }[]
  placeholder?: string; error?: string; disabled?: boolean
}) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onChange((e.target.value || undefined) as T | undefined)}
      className={clsx('input', error && 'border-red-300')}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Choice<T extends string | boolean>({ value, onChange, options, disabled }: {
  value?: T | null; onChange: (v: T) => void; options: { value: T; label: string }[]; disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-50',
            value === o.value ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const YES_NO = [{ value: true, label: 'Yes' }, { value: false, label: 'No' }]

export function MultiCheck<T extends string>({ value, onChange, options }: {
  value?: T[]; onChange: (v: T[]) => void; options: { value: T; label: string; hint?: string }[]
}) {
  const selected = value ?? []
  return (
    <div className="space-y-1.5">
      {options.map(o => (
        <label key={o.value} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-brand-500"
            checked={selected.includes(o.value)}
            onChange={e => onChange(e.target.checked ? [...selected, o.value] : selected.filter(v => v !== o.value))}
          />
          <span>
            {o.label}
            {o.hint && <span className="block text-xs text-gray-400">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

// Wraps an input that may be answered "I don't know" (stored as null)
export function Unknowable({ value, onChange, children }: { value: unknown; onChange: (v: null | undefined) => void; children: ReactNode }) {
  const unknown = value === null
  return (
    <div>
      {!unknown && children}
      {unknown && <p className="text-sm text-gray-500 italic py-2">Marked as unknown. We&apos;ll follow up on this.</p>}
      <label className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 cursor-pointer">
        <input type="checkbox" className="accent-brand-500" checked={unknown} onChange={e => onChange(e.target.checked ? null : undefined)} />
        I don&apos;t know
      </label>
    </div>
  )
}

export function MoneyInput({ value, onChange, error, placeholder = '0' }: {
  value?: number | null; onChange: (v: number | undefined) => void; error?: string; placeholder?: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={typeof value === 'number' ? value : ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={clsx('input pl-6', error && 'border-red-300')}
      />
    </div>
  )
}

export interface Address { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string }

export function AddressFields({ value, onChange, errorAt, path, fixedState }: {
  value?: Address; onChange: (v: Address) => void; errorAt: (path: string) => string | undefined; path: string; fixedState?: string
}) {
  const v = value ?? {}
  const set = (k: keyof Address, val: string) => onChange({ ...v, [k]: k === 'state' ? val.toUpperCase() : val, ...(fixedState && { state: fixedState }) })
  return (
    <div className="grid grid-cols-6 gap-2">
      <div className="col-span-6">
        <TextInput value={v.line1} onChange={x => set('line1', x)} placeholder="Street address" error={errorAt(`${path}/line1`)} />
      </div>
      <div className="col-span-6">
        <TextInput value={v.line2} onChange={x => set('line2', x)} placeholder="Suite, unit (optional)" />
      </div>
      <div className="col-span-3">
        <TextInput value={v.city} onChange={x => set('city', x)} placeholder="City" error={errorAt(`${path}/city`)} />
      </div>
      <div className="col-span-1">
        <TextInput value={fixedState ?? v.state} onChange={x => set('state', x.slice(0, 2))} placeholder="ST" disabled={!!fixedState} error={errorAt(`${path}/state`)} />
      </div>
      <div className="col-span-2">
        <TextInput value={v.postal_code} onChange={x => set('postal_code', x)} placeholder="ZIP" error={errorAt(`${path}/postal_code`)} />
      </div>
      {[errorAt(path), errorAt(`${path}/line1`), errorAt(`${path}/city`), errorAt(`${path}/state`), errorAt(`${path}/postal_code`)]
        .filter(Boolean).slice(0, 1).map(e => <p key="e" className="col-span-6 text-xs text-red-600">{e}</p>)}
    </div>
  )
}

// Converts common US formats to E.164 (+1XXXXXXXXXX); leaves other input as typed
export function toE164(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return raw
}
