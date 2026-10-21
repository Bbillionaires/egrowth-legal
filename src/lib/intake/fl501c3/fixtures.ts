// Sample answers shared by the intake tests
export const address = { line1: '100 Main St', city: 'Tampa', state: 'FL', postal_code: '33601' }

export function newOrgPayload() {
  return {
    schema_version: '2.0.0',
    unknown_fields: [] as string[],
    answers: {
      applicant: { name: 'Ana Ruiz', email: 'ana@example.org', phone: '+18135550100', role: 'founder', authorized: true },
      organization: {
        status: 'new',
        names: ['Helping Hands of Tampa Inc'],
        principal_address: { ...address },
        mission: 'Provide weekly hot meals to unhoused neighbors in Tampa.',
        exempt_purpose: 'charitable',
        beneficiaries: 'Unhoused adults in Hillsborough County.',
        geography: ['florida'],
      },
      activities: [{
        name: 'Meal service',
        description: 'Cook and serve hot meals three nights a week.',
        beneficiaries: 'Unhoused adults',
        location: 'Tampa',
        mission_connection: 'Directly relieves hunger',
        percent_resources: 100,
      }],
      governance: {
        directors: [{ id: 'd1', name: 'Ana Ruiz', address: { ...address }, email: 'ana@example.org', role: 'chair', relationships: 'none', compensated: false }],
        officers: [{ name: 'Ana Ruiz', title: 'President', director_id: 'd1' }],
        voting_members: 'no',
        director_selection: 'board',
      },
      agent: { kind: 'need_service' },
      finance: {
        fiscal_year_end: '12-31',
        projections: [2027, 2028, 2029].map(year => ({ year, receipts: { donations: 20000 }, expenses: { program: 18000 } })),
        asset_fmv: 0,
        funding_sources: ['donations'],
        public_charity_basis: { primary: 'public_donations' },
      },
      fundraising: { florida_solicitation: false },
      screen: { flags: [] as string[] },
      consent: { prepare: true },
    } as Record<string, any>,
  }
}
