'use client'
import Fl501c3Wizard from '@/components/intake/fl501c3/Wizard'

export default function StaffNonprofitIntakePage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Florida 501(c)(3) Intake</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete the intake with the client. Answers save as you move between steps.</p>
      </div>
      <Fl501c3Wizard interviewId={params.id} canEditSubmitted />
    </div>
  )
}
