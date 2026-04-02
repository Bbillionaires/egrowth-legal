'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { InterviewAnswers } from '@/lib/types'

const schema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  email:     z.string().email('Valid email required'),
  phone:     z.string().optional(),
  dob:       z.string().optional(),
  state:     z.string().min(1, 'State required'),
})
type FormData = z.infer<typeof schema>

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

interface Props {
  answers: InterviewAnswers
  onChange: (a: Partial<InterviewAnswers>) => void
  onNext: () => Promise<void>
  onBack: () => void
}

export default function StepClientInfo({ answers, onChange, onNext, onBack }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: answers.full_name ?? '',
      email:     answers.email ?? '',
      phone:     answers.phone ?? '',
      dob:       answers.dob ?? '',
      state:     answers.state ?? 'FL',
    },
  })

  async function onSubmit(data: FormData) {
    onChange(data)
    await onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h2 className="text-base font-medium mb-1">Client Information</h2>
      <p className="text-sm text-gray-500 mb-5">Basic details about the primary account holder.</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">First Name *</label>
          <input {...register('full_name')} placeholder="Robert Johnson" className="input" />
          {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <label className="label">State of Residence *</label>
          <select {...register('state')} className="input">
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="label">Email Address *</label>
        <input {...register('email')} type="email" placeholder="robert@email.com" className="input" />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Phone</label>
          <input {...register('phone')} placeholder="(904) 555-0100" className="input" />
        </div>
        <div>
          <label className="label">Date of Birth</label>
          <input {...register('dob')} type="date" className="input" />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100 mt-4">
        <button type="button" onClick={onBack} className="btn-secondary">← Back</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </form>
  )
}
