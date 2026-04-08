import TeamClient from '@/components/team/TeamClient'

export const dynamic = 'force-dynamic'

export default function TeamPage() {
  return <TeamClient team={[]} currentUserId="" currentRole="master" />
}