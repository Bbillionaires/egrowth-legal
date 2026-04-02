import { createClient } from '@/lib/supabase/server'
import { DollarSign, FolderLock, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function TrusteePage() {
  const supabase = await createClient()

  const [
    { data: accounts },
    { count: totalFiles },
    { data: ledger },
  ] = await Promise.all([
    supabase.from('trustee_accounts')
      .select('*, client:clients(full_name, email, state), manager:profiles!trustee_accounts_managed_by_fkey(full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_trustee_file', true),
    supabase.from('trustee_ledger').select('amount_cents, type').gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString()),
  ])

  const flatFeeYTD = ledger?.filter(l => l.type === 'flat_fee').reduce((a, l) => a + l.amount_cents, 0) ?? 0
  const pctFeeYTD  = ledger?.filter(l => l.type === 'percentage_fee').reduce((a, l) => a + l.amount_cents, 0) ?? 0
  const totalYTD   = flatFeeYTD + pctFeeYTD

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Trustee Portal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage all active trustee relationships and earnings.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Active Trustee Clients</p>
            <Users size={14} className="text-brand-500" />
          </div>
          <p className="text-2xl font-semibold">{accounts?.length ?? 0}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Files in Custody</p>
            <FolderLock size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-semibold">{totalFiles ?? 0}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Flat Fees YTD</p>
            <DollarSign size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-semibold">{fmt(flatFeeYTD)}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Total Revenue YTD</p>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold">{fmt(totalYTD)}</p>
        </div>
      </div>

      {/* Trustee accounts table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Trustee Clients</h2>
          <Link href="/interview" className="btn-primary text-xs py-1.5 px-3">+ Add Trustee Client</Link>
        </div>

        {!accounts || accounts.length === 0 ? (
          <div className="text-center py-10">
            <FolderLock size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No trustee accounts yet.</p>
            <Link href="/interview" className="btn-primary text-xs mt-3 inline-block px-4 py-2">Start a Trustee Interview</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Client</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Trust</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">State</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Flat Fee</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">% Fee</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Next Billing</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Manager</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map(acct => (
                <tr key={acct.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium">{(acct.client as any)?.full_name}</p>
                    <p className="text-xs text-gray-400">{(acct.client as any)?.email}</p>
                  </td>
                  <td className="py-3">
                    <p>{acct.trust_name}</p>
                    <p className="text-xs text-gray-400">{acct.trust_type}</p>
                  </td>
                  <td className="py-3 text-gray-500">{(acct.client as any)?.state ?? '—'}</td>
                  <td className="py-3">{fmt(acct.flat_fee_cents)}/yr</td>
                  <td className="py-3">{(acct.fee_percentage * 100).toFixed(2)}%</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {acct.next_billing ? new Date(acct.next_billing).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {(acct.manager as any)?.full_name ?? <span className="text-gray-300">Unassigned</span>}
                  </td>
                  <td className="py-3">
                    <span className="badge badge-active">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
