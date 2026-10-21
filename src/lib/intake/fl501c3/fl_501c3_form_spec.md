# Florida 501(c)(3) customer intake: implementation specification
Version 2.0.0 · 2026-10-21

## Contract
Use `fl_501c3_intake_schema.json` (JSON Schema draft 2020-12) for payload structure. This document supplies UI behavior and semantic checks. Save partial drafts; validate required visible fields at step completion and the full payload on final submission. Unknown answers must remain unknown; never infer legal facts from free text.

The intake is completed either by staff during a call (back office) or by the client in the client portal. Both paths write the same payload.

## Field catalog
`required` means required when visible. Addresses collect line 1, city, state, ZIP; store address line 2 optionally. Fields with conditions are hidden until triggered and omitted from submitted payload when hidden.

| Key | UI input | Required | Visibility / validation | Agent use or review |
|---|---|---|---|---|
| `applicant.name` | string | Yes | always;  |  |
| `applicant.email` | email | Yes | always; valid email; verify ownership |  |
| `applicant.phone` | phone | Yes | always; E.164 normalized (`+18135550100`) |  |
| `applicant.role` | enum: founder, director, authorized_agent, other | Yes | always;  |  |
| `applicant.authorized` | boolean | Yes | always;  | ; block_if_false |
| `organization.status` | enum: new, existing_florida, existing_other_state | Yes | always;  |  |
| `organization.existing` | object | Yes | organization.status != new; `state`, `incorporation_date`, `entity_id`, `ein` (if issued; unknown allowed), `prior_irs_status` (none/pending/exempt/denied/revoked; unknown allowed), `revocation_history` | ; manual_review |
| `organization.names` | array_string | Yes | always; 1–3 names; check Sunbiz, no guarantee |  |
| `organization.principal_address` | address | Yes | always; complete physical address |  |
| `organization.mailing_address` | address | No | always;  |  |
| `organization.mission` | text | Yes | always; 20–1000 characters | draft purpose and mission text |
| `organization.exempt_purpose` | enum: charitable, educational, religious, scientific, literary, amateur_sports, cruelty_prevention_children, cruelty_prevention_animals, other | Yes | always;  | ; review_if_other |
| `organization.beneficiaries` | text | Yes | always;  |  |
| `organization.geography` | multi_enum: florida, other_us_states, outside_us | Yes | always;  | ; review_if_outside_us |
| `activities` | array_activity | Yes | always; at least one; each item: name, what, who, where, how it furthers purpose, percent_resources; percentages total 100 | draft 1023 narrative |
| `governance.directors` | array_person | Yes | always; at least one; `id`, name, mailing address, email, role, relationships, compensated; `compensation_amount` required when compensated (unknown allowed) and omitted otherwise; warn below 3 | ; review_if_under_3_or_related_or_paid |
| `governance.officers` | array_officer | Yes | always; name and title; `director_id` maps to the director this officer also is |  |
| `governance.voting_members` | enum: yes, no, unsure | Yes | always;  | ; review_if_yes_or_unsure |
| `governance.director_selection` | enum: board, members, founder, other | Yes | always;  | ; review_if_founder_or_other |
| `agent.kind` | enum: individual, company, need_service | Yes | always;  |  |
| `agent.name` | string | Yes | agent.kind != need_service;  |  |
| `agent.florida_street_address` | address | Yes | agent.kind != need_service; Florida physical street address; no PO Box |  |
| `agent.accepted` | boolean | Yes | agent.kind != need_service; unknown allowed | ; block_filing_unless_true |
| `finance.fiscal_year_end` | month_day | Yes | always; MM-DD |  |
| `finance.actual_years` | array_financial_year | No | organization.status != new;  | populate full Form 1023 history |
| `finance.projections` | array_financial_year | Yes | always; 3 years; nonnegative amounts; revenue categories and expense categories; totals reconciled | assess EZ limits and draft financial schedule |
| `finance.asset_fmv` | currency | Yes | always; nonnegative; include noncash assets; unknown allowed | EZ worksheet screening |
| `finance.funding_sources` | multi_enum: donations, grants, fees, dues, sales, government, other | Yes | always;  |  |
| `finance.public_charity_basis` | object | Yes | always; sources and concentration of support, program fee mix, affiliations; allow unknown | classification analysis; review_if_unknown |
| `fundraising.florida_solicitation` | boolean | Yes | always;  | FDACS path |
| `fundraising.prior_contributions` | currency | No | fundraising.florida_solicitation = true; nonnegative; unknown allowed | small charity screen |
| `fundraising.paid_personnel` | boolean | Yes | fundraising.florida_solicitation = true; unknown allowed | ; review_if_true_or_unknown |
| `fundraising.professional_fundraiser` | boolean | Yes | fundraising.florida_solicitation = true; unknown allowed | ; review_if_true_or_unknown |
| `fundraising.methods` | object | Yes | fundraising.florida_solicitation = true;  | state registration queue |
| `screen.flags` | multi_enum: scholarships, individual_grants, organization_grants, foreign_operations, foreign_grants, school, hospital, church, lobbying, campaign_activity, substantial_sales, gaming, loans, founder_compensation, related_party_transactions, supporting_organization, donor_advised_funds, credit_counseling, disaster_relief, prior_revocation, successor_entity, private_foundation_intent | Yes | always;  | ; manual_review_for_selected; campaign_activity=stop_and_escalate |
| `screen.details` | object | Yes | screen.flags not empty; one explanation per selected flag | route to schedule and specialist review |
| `documents.uploads` | array_file | No | always; PDF/DOCX/XLSX; malware scan; access control; extraction must be confirmed | extract candidate facts with citations |
| `consent.prepare` | boolean | Yes | always;  | ; block_agent_preparation_if_false |
| `consent.submit` | boolean | No | always; collect separately per agency and exact reviewed filing; intake checkbox alone is insufficient | ; never_submit_from_intake |

## Unknown answers
An answer the customer does not know is stored as `null`, and its JSON Pointer (relative to `answers`, e.g. `/fundraising/prior_contributions` or `/governance/directors/0/compensation_amount`) is listed in the top-level `unknown_fields` array. Every listed pointer must hold `null`, and every `null` must be listed. Only these fields accept unknown:

- `/organization/existing/ein`, `/organization/existing/prior_irs_status`
- `/governance/directors/{n}/compensation_amount`
- `/agent/accepted`
- `/finance/asset_fmv`, `/finance/public_charity_basis`
- `/fundraising/prior_contributions`, `/fundraising/paid_personnel`, `/fundraising/professional_fundraiser`

`governance.voting_members` records uncertainty with its own `unsure` value. An unknown answer never satisfies a rule: rules that depend on it return `information_needed`.

## Semantic checks outside the schema
The server applies these after schema validation, because JSON Schema cannot express them:

1. `unknown_fields` and `null` values match exactly, and each pointer is one of the fields listed above.
2. `activities[].percent_resources` totals 100.
3. `screen.details` has no keys for flags that are not selected.
4. `finance.projections` covers three distinct, consecutive years; `actual_years` years are distinct.
5. `fiscal_year_end` is a real calendar date (no `02-30`).
6. Each `governance.directors[].id` is unique, and each `officers[].director_id` names an existing director.
7. `screen.flags` containing `campaign_activity` stops the intake and escalates (see `SPECIAL_REVIEW`).

## Rule evaluation and action queue
Evaluate deterministic rules from versioned agency guidance. A language model may draft text and suggest flags but cannot clear a blocking condition or decide eligibility alone. Return `{rule_id, result, source_version, evidence_field_ids, reviewer_status}` for each rule.

1. `FL_FORMATION`: if existing entity, route to amendment/foreign qualification/history review; new entities require name check, agent acceptance, articles with IRS purpose and dissolution clauses, customer review, and authorized filing.
2. `EZ_WORKSHEET`: use the entire current IRS Form 1023-EZ Eligibility Worksheet, including receipts, assets, entity type, activities, public charity classification and reinstatement. Any “Yes” disqualifier routes to full 1023; unknown routes to information needed. Never label eligible solely from the $50,000/$250,000 thresholds.
3. `FDACS`: if Florida solicitation is true, screen registration/exemption or small charitable organization procedure using current FDACS requirements. Prior contributions alone are insufficient. Queue before solicitation.
4. `SPECIAL_REVIEW`: selected special flags or related board/financial arrangements route to a qualified reviewer; campaign intervention is blocked for a proposed 501(c)(3) activity.
5. `SUBMISSION`: one approval object per exact filing/version/agency/fee and explicit signer action. Consent to prepare never grants consent to submit; never type another person’s signature.

## Agent outputs
Return `organization_profile`, `missing_information[]`, `risk_flags[]`, `rule_results[]`, `draft_documents[]`, and `proposed_actions[]`. Each proposed action contains `action_id`, `agency`, `input_document_ids`, `fee_quote_checked_at`, `status` (`information_needed|draft_ready|awaiting_customer_review|awaiting_signer|awaiting_submission_approval|submitted|completed`), `approval_record_id`, and `evidence`. Preserve source answer IDs and upload citations for all generated claims.

## Security and privacy
Collect sensitive IDs such as SSNs only in a separate secure EIN flow when needed; do not put them in this survey or LLM prompts. Encrypt uploads, restrict access by organization, scan files, log changes and approvals, and set a retention policy. Validate on the server, not just in the browser.

## Changes from 1.0.0
- `schema_version` is `2.0.0`; the payload adds the required `unknown_fields` array.
- Addresses accept an optional `line2` and validate state codes and ZIP codes.
- The registered agent address must be in Florida and cannot be a PO box.
- Directors use a structured address and add `id` and `role`; officers can reference a director with `director_id`.
- `organization.existing` has defined fields and is required for existing entities; it and `finance.actual_years` are rejected for new entities.
- Hidden fields are rejected rather than ignored: agent details when `need_service`, solicitation details when not soliciting in Florida, `compensation_amount` for unpaid directors, `screen.details` with no flags.
- Added limits: mission 1000 characters, exactly 3 projection years, at least one geography and funding source, E.164 phone, PDF/DOCX/XLSX upload names.

## Source links and rule maintenance
Recheck agency instructions at release and before filing. Store the date and version of each decision rule.
- Florida nonprofit articles: https://dos.fl.gov/sunbiz/start-business/efile/fl-nonprofit-corporation/instructions/
- IRS 1023-EZ instructions and worksheet: https://www.irs.gov/instructions/i1023ez
- IRS 1023-EZ revision notice: https://www.irs.gov/charities-non-profits/form-1023-ez-revisions
- Florida solicitation: https://www.fdacs.gov/business-services/solicitation-of-contributions
- IRS Form 1023: https://www.irs.gov/instructions/i1023
