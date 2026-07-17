// ─────────────────────────────────────────
// eGrowth DOCX Generation Engine
// Fills .docx templates with interview answers → returns Buffer
// Falls back to in-code rich generation when no template file exists
// ─────────────────────────────────────────
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { promises as fs } from 'fs'
import path from 'path'
import { InterviewAnswers, ServiceType } from '@/lib/types'
import { format } from 'date-fns'

// Map document type → template filename
const TEMPLATE_MAP: Record<string, string> = {
  'Revocable Living Trust':    'revocable_living_trust.docx',
  'Irrevocable Trust':         'irrevocable_trust.docx',
  'Land Trust':                'land_trust.docx',
  'Pour-Over Will':            'pour_over_will.docx',
  'Durable Power of Attorney': 'power_of_attorney.docx',
  'Healthcare Directive':      'healthcare_directive.docx',
  'Articles of Organization':  'articles_of_organization.docx',
  'Operating Agreement':       'operating_agreement.docx',
  'Articles of Incorporation': 'articles_of_incorporation.docx',
  'Bylaws':                    'bylaws.docx',
  'Trustee Agreement':         'trustee_agreement.docx',
  'File Custody Agreement':    'file_custody_agreement.docx',
  'Fee Schedule':              'fee_schedule.docx',
}

export interface GeneratedDoc {
  name: string
  documentType: string
  buffer: Buffer
}

export async function generateDocuments(
  serviceType: ServiceType,
  answers: InterviewAnswers,
  documentTypes: string[]
): Promise<GeneratedDoc[]> {
  const results: GeneratedDoc[] = []
  const today = format(new Date(), 'MMMM d, yyyy')
  const lastName = answers.full_name?.split(' ').pop() ?? 'Client'

  // Build shared template data
  const templateData = buildTemplateData(answers, today)

  for (const docType of documentTypes) {
    try {
      const templateFile = TEMPLATE_MAP[docType]
      if (!templateFile) continue

      const templatePath = path.join(process.cwd(), 'src', 'templates', templateFile)

      let buffer: Buffer
      try {
        const content = await fs.readFile(templatePath)
        buffer = await fillTemplate(content, templateData)
      } catch {
        // Template file doesn't exist — generate rich in-code DOCX
        buffer = generateRichDoc(docType, answers, today)
      }

      const fileName = `${lastName}_${docType.replace(/ /g, '_')}.docx`
      results.push({ name: fileName, documentType: docType, buffer })
    } catch (err) {
      console.error(`Failed to generate ${docType}:`, err)
    }
  }

  return results
}

function buildTemplateData(answers: InterviewAnswers, today: string): Record<string, string> {
  return {
    full_name:                 answers.full_name ?? '',
    email:                     answers.email ?? '',
    phone:                     answers.phone ?? '',
    dob:                       answers.dob ?? '',
    state:                     answers.state ?? '',
    date_today:                today,
    trust_name:                answers.trust_name ?? '',
    trust_type:                answers.trust_type ?? '',
    successor_trustee_name:    answers.successor_trustee_name ?? '',
    successor_trustee_relation:answers.successor_trustee_relation ?? '',
    beneficiaries:             answers.beneficiaries ?? '',
    entity_name:               answers.entity_name ?? '',
    entity_type:               answers.entity_type ?? '',
    registered_agent:          answers.registered_agent ?? '',
    members:                   answers.members ?? '',
    purpose:                   answers.purpose ?? '',
    org_name:                  answers.org_name ?? '',
    mission_statement:         answers.mission_statement ?? '',
    board_members:             answers.board_members ?? '',
    tax_year:                  answers.tax_year ?? '',
    trustee_company:           'eGrowth Legal LLC',
    trustee_address:           'Jacksonville, Florida',
    flat_fee:                  '$500.00',
    pct_fee:                   '1.5%',
    special_instructions:      answers.special_instructions ?? 'None',
  }
}

async function fillTemplate(content: Buffer, data: Record<string, string>): Promise<Buffer> {
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
}

// ─────────────────────────────────────────
// Open XML Helper Functions
// ─────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface ParaOpts {
  bold?: boolean
  centered?: boolean
  fontSize?: number  // half-points, e.g. 28 = 14pt, 56 = 28pt
  italic?: boolean
  underline?: boolean
  spaceAfter?: number // twips
}

function para(text: string, opts: ParaOpts = {}): string {
  const pPrParts: string[] = []
  if (opts.centered) pPrParts.push('<w:jc w:val="center"/>')
  if (opts.spaceAfter) pPrParts.push(`<w:spacing w:after="${opts.spaceAfter}"/>`)
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : ''

  const rPrParts: string[] = []
  if (opts.bold) rPrParts.push('<w:b/>')
  if (opts.italic) rPrParts.push('<w:i/>')
  if (opts.underline) rPrParts.push('<w:u w:val="single"/>')
  if (opts.fontSize) rPrParts.push(`<w:sz w:val="${opts.fontSize}"/><w:szCs w:val="${opts.fontSize}"/>`)
  const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : ''

  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function heading(text: string, level: 1 | 2 | 3): string {
  if (level === 1) return para(text, { bold: true, centered: true, fontSize: 32, spaceAfter: 120 })
  if (level === 2) return para(text, { bold: true, fontSize: 28, spaceAfter: 80 })
  return para(text, { bold: true, fontSize: 24, spaceAfter: 60 })
}

function emptyLine(): string {
  return '<w:p><w:r><w:t></w:t></w:r></w:p>'
}

function hr(): string {
  return `<w:p>
    <w:pPr>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="1" w:color="000000"/>
      </w:pBdr>
    </w:pPr>
    <w:r><w:t></w:t></w:r>
  </w:p>`
}

function signatureLine(name: string, role: string): string {
  return [
    emptyLine(),
    emptyLine(),
    para('_______________________________          Date: _______________'),
    para(`${name}`, { bold: true }),
    para(role, { italic: true }),
    emptyLine(),
  ].join('\n')
}

function notaryBlock(state: string): string {
  return [
    emptyLine(),
    hr(),
    heading('NOTARY ACKNOWLEDGMENT', 2),
    para(`STATE OF ${escapeXml(state).toUpperCase()}`),
    para('COUNTY OF ___________________________'),
    emptyLine(),
    para(
      `The foregoing instrument was acknowledged before me this _______ day of ` +
      `_______________, 20____, by _______________________________, ` +
      `who is personally known to me or has produced _______________________________ ` +
      `as identification.`
    ),
    emptyLine(),
    para('_______________________________          Commission Expires: _______________'),
    para('Notary Public, State of ' + state, { bold: true }),
    para('Printed Name: ___________________________'),
    emptyLine(),
  ].join('\n')
}

function article(number: string | number, title: string, body: string): string {
  return [
    emptyLine(),
    para(`ARTICLE ${number} — ${title}`, { bold: true, fontSize: 24 }),
    para(body),
  ].join('\n')
}

// ─────────────────────────────────────────
// Rich Document Dispatcher
// ─────────────────────────────────────────

function generateRichDoc(
  docType: string,
  answers: InterviewAnswers,
  today: string
): Buffer {
  const builders: Record<string, (a: InterviewAnswers, d: string) => string> = {
    'Revocable Living Trust':    buildRevocableLivingTrust,
    'Irrevocable Trust':         buildIrrevocableTrust,
    'Land Trust':                buildLandTrust,
    'Pour-Over Will':            buildPourOverWill,
    'Durable Power of Attorney': buildDurablePOA,
    'Healthcare Directive':      buildHealthcareDirective,
    'Articles of Organization':  buildArticlesOfOrganization,
    'Operating Agreement':       buildOperatingAgreement,
    'Articles of Incorporation': buildArticlesOfIncorporation,
    'Bylaws':                    buildBylaws,
    'Trustee Agreement':         buildTrusteeAgreement,
    'File Custody Agreement':    buildFileCustodyAgreement,
    'Fee Schedule':              buildFeeSchedule,
  }

  const builder = builders[docType]
  const bodyXml = builder ? builder(answers, today) : buildGenericDoc(docType, answers, today)

  return assembleDocx(bodyXml)
}

function assembleDocx(bodyXml: string): Buffer {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`

  const zip = new PizZip()
  zip.file('word/document.xml', docXml)
  zip.file('[Content_Types].xml', contentTypesXml)
  zip.file('_rels/.rels', relsXml)
  zip.file('word/_rels/document.xml.rels', wordRelsXml)

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
}

// ─────────────────────────────────────────
// 1. Revocable Living Trust
// ─────────────────────────────────────────
function buildRevocableLivingTrust(a: InterviewAnswers, today: string): string {
  const name       = a.full_name ?? 'Grantor'
  const state      = a.state ?? 'Florida'
  const trustName  = a.trust_name ?? `The ${name} Revocable Living Trust`
  const successor  = a.successor_trustee_name ?? '[Successor Trustee Name]'
  const benefics   = a.beneficiaries ?? '[Beneficiaries as set forth in Schedule A]'

  return [
    heading(trustName.toUpperCase(), 1),
    para('A Revocable Living Trust', { centered: true, fontSize: 26 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `KNOW ALL MEN BY THESE PRESENTS, that I, ${name} (hereinafter "Grantor" and ` +
      `"Trustee"), a resident of the State of ${state}, hereby declare that I have set aside ` +
      `and hold the property described in Schedule A attached hereto, IN TRUST, for the uses ` +
      `and purposes and upon the terms and conditions hereinafter set forth.`
    ),
    article('I', 'DECLARATION OF TRUST',
      `The Grantor, ${name}, hereby transfers and delivers to the Trustee all property ` +
      `described in Schedule A attached hereto and incorporated herein by reference. ` +
      `This Trust shall be known as the "${trustName}." The Trustee agrees to hold such ` +
      `property and any other property subsequently transferred to this Trust, IN TRUST, ` +
      `subject to the terms and conditions of this Declaration.`
    ),
    article('II', 'REVOCATION AND AMENDMENT',
      `This Trust is revocable. The Grantor reserves the right at any time during the ` +
      `Grantor's lifetime, by a written instrument delivered to the Trustee, to alter, amend, ` +
      `revoke, or terminate this Trust in whole or in part, or to withdraw any property from ` +
      `the Trust estate. No amendment or revocation shall affect the rights of any third party ` +
      `who has acted in reliance upon this Trust prior to receipt of written notice of such ` +
      `amendment or revocation.`
    ),
    article('III', 'TRUSTEE POWERS',
      `The Trustee, in addition to all other powers granted by law, shall have the following ` +
      `powers with respect to the Trust estate, to be exercised in the Trustee's sole ` +
      `discretion without court approval: (a) To retain, sell, exchange, or otherwise dispose ` +
      `of any property in the Trust estate; (b) To invest and reinvest Trust assets in any ` +
      `property, including stocks, bonds, mutual funds, real estate, and money market instruments; ` +
      `(c) To collect and receive the income, rents, profits, and proceeds of the Trust property; ` +
      `(d) To make distributions in cash or in kind, or partly in each; (e) To employ attorneys, ` +
      `accountants, investment advisors, and other agents as deemed necessary; (f) To execute all ` +
      `documents necessary to carry out the purposes of this Trust.`
    ),
    article('IV', 'DISTRIBUTIONS DURING GRANTOR\'S LIFETIME',
      `During the lifetime of the Grantor, the Trustee shall hold, manage, invest, and reinvest ` +
      `the Trust property, and shall pay to or apply for the benefit of the Grantor such amounts ` +
      `of the net income and principal as the Grantor may direct at any time and from time to time. ` +
      `Any net income not distributed shall be added to and become a part of the Trust principal.`
    ),
    article('V', 'DISTRIBUTION ON DEATH — SUCCESSOR BENEFICIARIES',
      `Upon the death of the Grantor, the then-acting Trustee shall administer and distribute ` +
      `the Trust estate as follows: The Trustee shall pay all legally enforceable debts, ` +
      `expenses of last illness, and costs of administration. Thereafter, the Trustee shall ` +
      `distribute the remaining Trust estate to: ${benefics}. ` +
      `Distributions shall be made in equal shares unless otherwise specified in Schedule B ` +
      `attached hereto. Any share passing to a minor shall be held in a separate sub-trust ` +
      `until such beneficiary reaches age twenty-five (25).`
    ),
    article('VI', 'SUCCESSOR TRUSTEE',
      `If the Grantor becomes unable or unwilling to serve as Trustee due to death, ` +
      `incapacity, or resignation, ${successor} shall serve as Successor Trustee. ` +
      `The Successor Trustee shall have all powers and authorities vested in the original Trustee. ` +
      `Incapacity shall be established by written certification of two licensed physicians. ` +
      `The Successor Trustee may resign by delivering thirty (30) days' written notice to all ` +
      `current beneficiaries of record.`
    ),
    article('VII', 'NO-CONTEST CLAUSE',
      `Any beneficiary who contests the validity of this Trust or any provision hereof, or ` +
      `who conspires with or assists any person in such a contest, shall forfeit any and all ` +
      `interests under this Trust and shall be treated as having predeceased the Grantor ` +
      `without surviving descendants.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, I have executed this Revocable Living Trust on the date first written above.`),
    signatureLine(name, 'Grantor and Initial Trustee'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 2. Irrevocable Trust
// ─────────────────────────────────────────
function buildIrrevocableTrust(a: InterviewAnswers, today: string): string {
  const name       = a.full_name ?? 'Grantor'
  const state      = a.state ?? 'Florida'
  const trustName  = a.trust_name ?? `The ${name} Irrevocable Trust`
  const successor  = a.successor_trustee_name ?? '[Trustee Name]'
  const benefics   = a.beneficiaries ?? '[Beneficiaries as set forth in Schedule A]'

  return [
    heading(trustName.toUpperCase(), 1),
    para('An Irrevocable Trust', { centered: true, fontSize: 26 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `KNOW ALL MEN BY THESE PRESENTS, that I, ${name} ("Grantor"), a resident of the State ` +
      `of ${state}, do hereby IRREVOCABLY transfer, convey, and deliver to ${successor} ` +
      `("Trustee") the property described in Schedule A, to be held in trust upon the ` +
      `terms and conditions set forth herein. This Trust is IRREVOCABLE and may not be ` +
      `amended, revoked, or terminated by the Grantor.`
    ),
    article('I', 'IRREVOCABILITY',
      `This Trust is irrevocable. Once executed, the Grantor relinquishes all right, title, ` +
      `and interest in and to the Trust property and shall have no power to alter, amend, revoke, ` +
      `or terminate this Trust or any of its provisions. The Grantor retains no right to reclaim ` +
      `the property transferred hereunder. This irrevocability is intended to provide asset ` +
      `protection and potential Medicaid planning benefits in accordance with applicable law.`
    ),
    article('II', 'ASSET PROTECTION',
      `The Trust assets shall not be subject to the claims of the Grantor's creditors, nor ` +
      `shall they be considered a countable asset for purposes of Medicaid eligibility after ` +
      `the applicable look-back period has elapsed. The Trustee shall have no obligation to ` +
      `return Trust assets to the Grantor or to make the Trust assets available to satisfy the ` +
      `Grantor's personal obligations.`
    ),
    article('III', 'TRUSTEE POWERS AND DUTIES',
      `The Trustee shall hold, manage, invest, and distribute the Trust property for the ` +
      `benefit of the designated beneficiaries. The Trustee shall have full power and authority ` +
      `to: (a) invest and reinvest Trust assets; (b) collect income and principal; (c) pay ` +
      `Trust expenses; (d) execute contracts and leases; (e) file tax returns on behalf of the ` +
      `Trust. The Trustee shall act in a fiduciary capacity and shall be held to the Prudent ` +
      `Investor Standard as codified under Florida law.`
    ),
    article('IV', 'INCOME AND PRINCIPAL DISTRIBUTIONS',
      `During the term of this Trust, the Trustee may, in the Trustee's sole and absolute ` +
      `discretion, distribute income and/or principal to or for the benefit of: ${benefics}. ` +
      `In exercising such discretion, the Trustee may consider the health, education, ` +
      `maintenance, and support of each beneficiary. The Trustee shall not be required to ` +
      `make equal distributions among the beneficiaries.`
    ),
    article('V', 'TERMINATION AND DISTRIBUTION',
      `This Trust shall terminate upon the occurrence of the earliest of the following: ` +
      `(a) the death of the Grantor and the complete distribution of the Trust estate; or ` +
      `(b) such date as the Trustee determines that the Trust has become uneconomical to ` +
      `administer. Upon termination, the remaining Trust assets shall be distributed to ` +
      `${benefics} in equal shares, or as otherwise provided in Schedule B.`
    ),
    article('VI', 'SPENDTHRIFT PROVISION',
      `No beneficiary shall have the right to sell, assign, transfer, encumber, or in any ` +
      `manner alienate any interest in the income or principal of this Trust. No such interest ` +
      `shall be subject to execution, levy, attachment, garnishment, or any other legal or ` +
      `equitable process. The Trustee shall have no obligation to recognize any attempted ` +
      `alienation.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, the parties have executed this Irrevocable Trust on the date first written above.`),
    signatureLine(name, 'Grantor'),
    signatureLine(successor, 'Trustee'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 3. Land Trust
// ─────────────────────────────────────────
function buildLandTrust(a: InterviewAnswers, today: string): string {
  const name      = a.full_name ?? 'Beneficiary'
  const state     = a.state ?? 'Florida'
  const trustName = a.trust_name ?? `${name} Land Trust No. ${today.replace(/[^0-9]/g, '').slice(-6)}`
  const trustee   = a.successor_trustee_name ?? 'eGrowth Legal LLC, as Trustee'

  return [
    heading(trustName.toUpperCase(), 1),
    para('An Illinois-Type Land Trust', { centered: true, fontSize: 26 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `KNOW ALL MEN BY THESE PRESENTS, that ${trustee} ("Trustee") does hereby acknowledge ` +
      `receipt of the property described in Exhibit A and agrees to hold title to said property ` +
      `IN TRUST for the benefit of ${name} ("Beneficiary") upon the terms and conditions ` +
      `set forth in this Land Trust Agreement.`
    ),
    article('I', 'TITLE HELD BY TRUSTEE',
      `The Trustee shall hold legal title to all real property transferred to this Trust. ` +
      `The Trustee's interest is solely that of a legal title holder. All deeds, mortgages, ` +
      `contracts, and other instruments affecting the real property shall be executed by the ` +
      `Trustee upon the written direction of the Beneficiary. Third parties may rely upon ` +
      `the Trustee's authority without inquiry into the Trust.`
    ),
    article('II', 'BENEFICIAL INTEREST',
      `The entire beneficial interest in this Trust, including all rights to direct the ` +
      `Trustee, to manage and control the property, and to receive all proceeds, income, ` +
      `and profits from the Trust property, vests exclusively in ${name} as Beneficiary. ` +
      `The Beneficiary's interest shall be personal property and shall not be deemed a real ` +
      `property interest for any purpose.`
    ),
    article('III', 'PRIVACY AND CONFIDENTIALITY',
      `The identity of the Beneficiary shall not be disclosed by the Trustee to any third ` +
      `party except as required by court order or applicable law. Deeds and other recorded ` +
      `documents shall reflect only the Trustee's name and the Trust name. This privacy ` +
      `feature is a primary purpose of this Land Trust and shall be preserved to the maximum ` +
      `extent permitted by law.`
    ),
    article('IV', 'DIRECTION BY BENEFICIARY',
      `The Trustee shall not deal with the Trust property in any manner except upon the written ` +
      `direction of the Beneficiary or the Beneficiary's duly authorized agent. The Trustee ` +
      `shall be fully protected in acting upon any written direction of the Beneficiary and ` +
      `shall incur no personal liability in following such directions.`
    ),
    article('V', 'TRUSTEE COMPENSATION AND LIMITATION OF LIABILITY',
      `The Trustee shall be entitled to reasonable compensation for services rendered, which ` +
      `shall be agreed upon in a separate fee agreement. The Trustee shall have no personal ` +
      `liability to any person in connection with the Trust property except for the Trustee's ` +
      `own gross negligence or willful misconduct. The Trustee shall have no duty to maintain ` +
      `insurance on the property unless directed in writing by the Beneficiary.`
    ),
    article('VI', 'TRANSFER OF BENEFICIAL INTEREST',
      `The Beneficiary may transfer the beneficial interest in this Trust by assignment, ` +
      `without the necessity of executing a new deed to the real property. Such assignment ` +
      `shall be effectuated by a written Assignment of Beneficial Interest executed by the ` +
      `Beneficiary and delivered to the Trustee. No such assignment shall release the ` +
      `Beneficiary from any obligations assumed prior to the assignment.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, the parties have executed this Land Trust Agreement on the date first written above.`),
    signatureLine(name, 'Beneficiary'),
    signatureLine(trustee, 'Trustee'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 4. Pour-Over Will
// ─────────────────────────────────────────
function buildPourOverWill(a: InterviewAnswers, today: string): string {
  const name      = a.full_name ?? 'Testator'
  const state     = a.state ?? 'Florida'
  const trustName = a.trust_name ?? `The ${name} Revocable Living Trust`
  const successor = a.successor_trustee_name ?? '[Personal Representative]'

  return [
    heading('LAST WILL AND TESTAMENT', 1),
    heading(`OF ${name.toUpperCase()}`, 1),
    para('(With Pour-Over Provision)', { centered: true, fontSize: 24 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `I, ${name}, a resident of the State of ${state}, being of sound mind and disposing ` +
      `memory and not acting under duress, menace, fraud, or undue influence of any person ` +
      `whomsoever, do hereby make, publish, and declare this to be my Last Will and ` +
      `Testament, hereby revoking all former Wills and Codicils made by me.`
    ),
    article('I', 'DECLARATION',
      `I declare that I am a resident of the State of ${state}. I am not married / ` +
      `[marital status as applicable]. My children, if any, are as listed in Schedule A.`
    ),
    article('II', 'PAYMENT OF DEBTS AND EXPENSES',
      `I direct my Personal Representative to pay all of my legally enforceable debts, ` +
      `funeral expenses, expenses of last illness, and the costs of administration of ` +
      `my estate as soon as practicable after my death, unless it would be disadvantageous ` +
      `to do so. My Personal Representative shall have the discretion to pay, contest, ` +
      `or allow to lapse any debts of my estate.`
    ),
    article('III', 'POUR-OVER PROVISION',
      `I give, devise, and bequeath all of the rest, residue, and remainder of my estate, ` +
      `both real and personal, wherever situated, including all property over which I may ` +
      `have a power of appointment, to the then-acting Trustee of the "${trustName}," dated ` +
      `${today}, to be held, administered, and distributed in accordance with the terms of ` +
      `that Trust and any amendments thereto. If said Trust has been revoked or has failed, ` +
      `the residue shall be distributed as set forth in Schedule B.`
    ),
    article('IV', 'PERSONAL REPRESENTATIVE',
      `I appoint ${successor} as Personal Representative of my estate. If ${successor} ` +
      `is unable or unwilling to serve, I appoint [Alternate Personal Representative] as ` +
      `successor Personal Representative. My Personal Representative shall serve without ` +
      `bond. I grant my Personal Representative the full power and authority to administer ` +
      `my estate, including the power to sell, exchange, or otherwise dispose of estate ` +
      `assets without court approval.`
    ),
    article('V', 'GUARDIAN OF MINOR CHILDREN',
      `If I am survived by any minor children and their other parent is unable or unwilling ` +
      `to serve as guardian, I nominate and appoint [Guardian Name] as guardian of the ` +
      `person and estate of my minor children. This appointment reflects my careful ` +
      `consideration of the best interests of my children.`
    ),
    article('VI', 'NO-CONTEST CLAUSE',
      `Any beneficiary who contests the validity of this Will, or any provision thereof, ` +
      `shall forfeit all interests to which they would otherwise be entitled under this Will.`
    ),
    emptyLine(),
    hr(),
    heading('ATTESTATION AND SIGNATURE', 2),
    para(
      `I, ${name}, the Testator, declare that I sign and execute this instrument as my ` +
      `Last Will and Testament and that I sign it willingly, that I execute it as my free ` +
      `and voluntary act for the purposes therein expressed, and that I am of the age of ` +
      `majority and sound mind and under no constraint or undue influence, this ${today}.`
    ),
    signatureLine(name, 'Testator'),
    emptyLine(),
    para('WITNESSES:', { bold: true }),
    para('We, the undersigned, declare under penalty of perjury that the foregoing instrument was signed by the Testator as their Last Will and Testament in our presence, and that we sign below as witnesses.'),
    signatureLine('[Witness One Name]', 'Witness'),
    signatureLine('[Witness Two Name]', 'Witness'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 5. Durable Power of Attorney
// ─────────────────────────────────────────
function buildDurablePOA(a: InterviewAnswers, today: string): string {
  const name    = a.full_name ?? 'Principal'
  const state   = a.state ?? 'Florida'
  const agent   = a.successor_trustee_name ?? '[Agent Name]'

  return [
    heading('DURABLE POWER OF ATTORNEY', 1),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `KNOW ALL PERSONS BY THESE PRESENTS, that I, ${name} ("Principal"), a resident of ` +
      `the State of ${state}, hereby appoint ${agent} ("Agent") as my true and lawful ` +
      `attorney-in-fact to act in my name, place, and stead with respect to the matters ` +
      `described herein. This Power of Attorney shall be DURABLE and shall not be affected ` +
      `by my subsequent disability or incapacity.`
    ),
    para(
      `IMPORTANT NOTICE: This document gives the person you designate (your "agent") broad ` +
      `powers to handle your property, which may include powers to pledge, sell, or otherwise ` +
      `dispose of any real or personal property without advance notice to you or approval by you. ` +
      `Read this document carefully.`,
      { italic: true, bold: true }
    ),
    article('I', 'FINANCIAL AND PROPERTY POWERS',
      `I grant my Agent full power and authority over all of my property and affairs, including ` +
      `but not limited to: (a) Banking — to open, close, and manage bank accounts, make deposits ` +
      `and withdrawals, access safe deposit boxes; (b) Real Estate — to purchase, sell, lease, ` +
      `mortgage, or otherwise deal with any real property; (c) Investments — to manage investment ` +
      `accounts, purchase and sell securities, bonds, and other financial instruments; ` +
      `(d) Taxes — to prepare, sign, and file federal, state, and local tax returns; to respond ` +
      `to tax authorities; (e) Government Benefits — to apply for and manage Social Security, ` +
      `Medicare, Medicaid, and other government benefits; (f) Business Operations — to manage, ` +
      `operate, or dissolve any business in which I have an interest; (g) Insurance — to ` +
      `maintain, acquire, or surrender insurance policies; (h) Gifts — to make gifts on my ` +
      `behalf consistent with my established pattern of giving, subject to annual exclusion limits.`
    ),
    article('II', 'DURABILITY',
      `This Power of Attorney shall not be affected by my subsequent disability, incapacity, ` +
      `or mental incompetence. It is my intent that this Power of Attorney be construed and ` +
      `interpreted as a durable power of attorney pursuant to the Florida Durable Power of ` +
      `Attorney Act, § 709.2101 et seq., Florida Statutes. All acts done by my Agent pursuant ` +
      `to this Power of Attorney during any period of my disability or incapacity shall have ` +
      `the same effect as if I were present and competent.`
    ),
    article('III', 'AGENT\'S DUTIES',
      `My Agent shall act in my best interest and in good faith. My Agent shall: (a) Act only ` +
      `within the scope of authority granted herein; (b) Keep records of all transactions; ` +
      `(c) Not commingle my assets with the Agent's own assets; (d) Promptly notify me or ` +
      `my successors of any material development affecting my interests; (e) Act with ` +
      `reasonable care, competence, and diligence.`
    ),
    article('IV', 'THIRD-PARTY RELIANCE',
      `Any third party who acts in good faith reliance on this Power of Attorney shall be ` +
      `fully protected and held harmless. A third party who receives a copy of this Power ` +
      `of Attorney may act under it unless that party has received written notice of revocation, ` +
      `termination, or suspension.`
    ),
    article('V', 'REVOCATION',
      `This Power of Attorney may be revoked by me at any time by written notice to my Agent ` +
      `and to any third parties relying on this instrument. Revocation shall be effective upon ` +
      `delivery of written notice. This Power of Attorney shall automatically terminate upon ` +
      `my death.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, I have executed this Durable Power of Attorney on the date first written above.`),
    signatureLine(name, 'Principal'),
    emptyLine(),
    para('AGENT ACKNOWLEDGMENT:', { bold: true }),
    para(`I, ${agent}, accept the appointment as Agent and acknowledge my duties and responsibilities under this Power of Attorney.`),
    signatureLine(agent, 'Agent'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 6. Healthcare Directive
// ─────────────────────────────────────────
function buildHealthcareDirective(a: InterviewAnswers, today: string): string {
  const name    = a.full_name ?? 'Declarant'
  const state   = a.state ?? 'Florida'
  const agent   = a.successor_trustee_name ?? '[Healthcare Surrogate Name]'

  return [
    heading('ADVANCE HEALTHCARE DIRECTIVE', 1),
    para('Living Will and Healthcare Surrogate Designation', { centered: true, fontSize: 24 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `I, ${name}, being of sound mind and legal capacity, hereby make this Advance ` +
      `Healthcare Directive. I intend this document to be legally binding and to take ` +
      `effect when I am unable to make my own healthcare decisions. This document ` +
      `consists of two parts: a Designation of Healthcare Surrogate and a Living Will.`
    ),
    heading('PART ONE: DESIGNATION OF HEALTHCARE SURROGATE', 2),
    article('I', 'DESIGNATION',
      `I hereby designate ${agent} as my Healthcare Surrogate to make healthcare decisions ` +
      `for me when I am unable to make my own. My Healthcare Surrogate shall have full ` +
      `authority to: (a) Consent to, refuse, or withdraw medical treatment on my behalf; ` +
      `(b) Access my medical records; (c) Consent to or refuse diagnostic procedures, ` +
      `surgical procedures, and therapeutic procedures; (d) Authorize the administration ` +
      `or withholding of medication; (e) Arrange for and consent to hospice care.`
    ),
    article('II', 'SUCCESSOR SURROGATE',
      `If ${agent} is unable or unwilling to serve, I designate [Alternate Surrogate Name] ` +
      `as my Successor Healthcare Surrogate with the same authority.`
    ),
    heading('PART TWO: LIVING WILL', 2),
    article('III', 'DECLARATION OF WISHES',
      `I, ${name}, willfully and voluntarily make known my desire that my dying not be ` +
      `artificially prolonged under the circumstances set forth below, and I do hereby ` +
      `declare: If at any time I have a terminal condition, end-stage condition, or am in ` +
      `a persistent vegetative state, and if my attending or treating physician and one other ` +
      `consulting physician have determined that there is no reasonable medical probability ` +
      `of recovery, I direct that life-prolonging procedures be withheld or withdrawn when ` +
      `the application of such procedures would serve only to prolong artificially the dying ` +
      `process, and I be permitted to die naturally.`
    ),
    article('IV', 'PAIN MANAGEMENT',
      `Notwithstanding any other provision of this Directive, I do desire that provision ` +
      `be made for the alleviation of pain, discomfort, and suffering. I authorize the ` +
      `administration of medication or other procedures to provide comfort care and to ` +
      `relieve pain, even if such medication or procedures may hasten my death.`
    ),
    article('V', 'ARTIFICIAL NUTRITION AND HYDRATION',
      `[ ] I DO want artificial nutrition and hydration maintained if I am in a terminal ` +
      `condition, end-stage condition, or persistent vegetative state.\n` +
      `[ ] I DO NOT want artificial nutrition and hydration if I am in a terminal condition, ` +
      `end-stage condition, or persistent vegetative state.\n` +
      `(Initial the appropriate line above and strike the other.)`
    ),
    article('VI', 'ORGAN AND TISSUE DONATION',
      `[ ] I CONSENT to the donation of any or all of my organs and tissues at my death ` +
      `for the purposes of transplantation, research, or education.\n` +
      `[ ] I DO NOT consent to organ or tissue donation.\n` +
      `(Initial the appropriate line above and strike the other.)`
    ),
    article('VII', 'HIPAA AUTHORIZATION',
      `I authorize my Healthcare Surrogate to have full access to all of my protected ` +
      `health information as defined by the Health Insurance Portability and Accountability ` +
      `Act (HIPAA). This authorization shall remain in effect until revoked in writing.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(
      `Signed this ${today}, at _________________________, ${state}.`
    ),
    signatureLine(name, 'Declarant'),
    emptyLine(),
    para('WITNESSES:', { bold: true }),
    para('We, the undersigned, declare that the above-named person signed this document in our presence.'),
    signatureLine('[Witness One — Not Related or Healthcare Provider]', 'Witness'),
    signatureLine('[Witness Two — Not Related or Healthcare Provider]', 'Witness'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 7. Articles of Organization (LLC)
// ─────────────────────────────────────────
function buildArticlesOfOrganization(a: InterviewAnswers, today: string): string {
  const entity   = a.entity_name ?? '[LLC Name], LLC'
  const state    = a.state ?? 'Florida'
  const agent    = a.registered_agent ?? '[Registered Agent Name and Address]'
  const members  = a.members ?? '[Member Name(s)]'
  const purpose  = a.purpose ?? 'any lawful business purpose'

  return [
    heading('ARTICLES OF ORGANIZATION', 1),
    heading(`OF ${entity.toUpperCase()}`, 1),
    para(`A Limited Liability Company`, { centered: true, fontSize: 24 }),
    para(`State of ${state}`, { centered: true }),
    para(`Filed: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `Pursuant to the applicable provisions of the ${state} Limited Liability Company Act, ` +
      `the undersigned, being duly authorized, hereby adopts these Articles of Organization ` +
      `for the purpose of organizing a Limited Liability Company.`
    ),
    article('I', 'NAME',
      `The name of the Limited Liability Company is: ${entity}.`
    ),
    article('II', 'PURPOSE',
      `The purpose of this Limited Liability Company is to engage in ${purpose}, and in ` +
      `any and all other lawful acts and activities for which Limited Liability Companies ` +
      `may be organized under the laws of the State of ${state}.`
    ),
    article('III', 'PRINCIPAL OFFICE AND REGISTERED AGENT',
      `The principal office of the Company is located at [Principal Office Address], ` +
      `${state}. The registered agent for service of process is: ${agent}. The registered ` +
      `agent has consented to serve in this capacity.`
    ),
    article('IV', 'MANAGEMENT',
      `This Limited Liability Company shall be managed by its Member(s) (Member-Managed). ` +
      `The name(s) and address(es) of the initial Member(s) are as follows: ${members}. ` +
      `The Members shall have authority to bind the Company and to make decisions regarding ` +
      `the management of the Company's business and affairs.`
    ),
    article('V', 'LIABILITY',
      `The liability of the Members of this Limited Liability Company for the debts, ` +
      `obligations, and liabilities of the Company shall be limited to the extent provided ` +
      `under the ${state} Limited Liability Company Act. No Member shall be personally liable ` +
      `for any debt, obligation, or liability of the Company solely by reason of being ` +
      `a Member of the Company.`
    ),
    article('VI', 'TERM',
      `The term of existence of this Limited Liability Company shall be perpetual, ` +
      `commencing on the date these Articles of Organization are filed with the ` +
      `${state} Secretary of State, unless sooner dissolved in accordance with ` +
      `applicable law or the Company's Operating Agreement.`
    ),
    article('VII', 'ORGANIZER',
      `These Articles of Organization are executed by the Organizer for the purpose of ` +
      `forming a Limited Liability Company under the laws of the State of ${state}.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, the Organizer has executed these Articles of Organization as of the date first written above.`),
    signatureLine(members, 'Organizer / Member'),
    emptyLine(),
    para('FOR SECRETARY OF STATE USE ONLY:', { bold: true }),
    para('Document Number: _______________________'),
    para('Filing Date: ___________________________'),
    para('Effective Date: ________________________'),
  ].join('\n')
}

// ─────────────────────────────────────────
// 8. Operating Agreement (LLC)
// ─────────────────────────────────────────
function buildOperatingAgreement(a: InterviewAnswers, today: string): string {
  const entity   = a.entity_name ?? '[LLC Name], LLC'
  const state    = a.state ?? 'Florida'
  const members  = a.members ?? '[Member Name(s)]'
  const purpose  = a.purpose ?? 'any lawful business purpose'

  return [
    heading('OPERATING AGREEMENT', 1),
    heading(`OF ${entity.toUpperCase()}`, 1),
    para('A Member-Managed Limited Liability Company', { centered: true, fontSize: 24 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `This Operating Agreement ("Agreement") is entered into as of ${today}, by and among ` +
      `the Member(s) listed in Exhibit A attached hereto (collectively, "Members"), for the ` +
      `purpose of setting forth the rights, duties, and obligations of the Members with ` +
      `respect to ${entity} (the "Company"), a ${state} Limited Liability Company.`
    ),
    article('I', 'FORMATION AND NAME',
      `The Company has been organized as a ${state} Limited Liability Company under the ` +
      `provisions of the ${state} LLC Act. The name of the Company is ${entity}. The ` +
      `principal place of business shall be at the address listed in Exhibit A. The term ` +
      `of the Company shall be perpetual unless otherwise dissolved pursuant to this Agreement.`
    ),
    article('II', 'PURPOSE',
      `The purpose of the Company is to engage in ${purpose}, and any other lawful activity ` +
      `for which Limited Liability Companies may be organized in the State of ${state}.`
    ),
    article('III', 'MEMBERS AND CAPITAL CONTRIBUTIONS',
      `The name, address, and initial capital contribution of each Member is set forth in ` +
      `Exhibit A. The initial Members are: ${members}. Additional Members may be admitted ` +
      `only upon unanimous written consent of all existing Members. No Member shall be ` +
      `required to make any additional capital contribution without unanimous consent. ` +
      `No interest shall be paid on capital contributions. Capital contributions shall ` +
      `not be deemed loans to the Company.`
    ),
    article('IV', 'ALLOCATIONS AND DISTRIBUTIONS',
      `Profits and losses of the Company shall be allocated among the Members in proportion ` +
      `to their respective membership interests as set forth in Exhibit A. Distributions ` +
      `shall be made to the Members at such times and in such amounts as determined by the ` +
      `unanimous vote of the Members, provided that no distribution shall be made if it ` +
      `would render the Company insolvent or unable to pay its debts as they come due.`
    ),
    article('V', 'MANAGEMENT',
      `The Company shall be managed by its Members. Each Member shall have authority to ` +
      `act for and bind the Company in the ordinary course of business. The following ` +
      `actions shall require unanimous written consent of all Members: (a) Amendment of ` +
      `this Agreement; (b) Admission of new Members; (c) Dissolution of the Company; ` +
      `(d) Merger or consolidation; (e) Sale of substantially all Company assets; ` +
      `(f) Incurrence of indebtedness exceeding $[Threshold] in any single transaction.`
    ),
    article('VI', 'TRANSFER OF MEMBERSHIP INTERESTS',
      `No Member may sell, assign, transfer, pledge, or otherwise dispose of any membership ` +
      `interest without the prior written consent of all other Members. Any attempted ` +
      `transfer in violation of this provision shall be null and void. An assignee of a ` +
      `membership interest shall have no right to participate in management unless ` +
      `admitted as a Member by unanimous written consent of the existing Members.`
    ),
    article('VII', 'DISSOLUTION AND WINDING UP',
      `The Company shall be dissolved upon the occurrence of any of the following events: ` +
      `(a) The unanimous written agreement of all Members to dissolve; (b) The entry of a ` +
      `judicial decree of dissolution; (c) Any other event causing dissolution under ` +
      `applicable law. Upon dissolution, the Company's affairs shall be wound up by ` +
      `the Members. Assets shall first be applied to Company debts, then to Members ` +
      `in proportion to their capital accounts, then in proportion to their membership interests.`
    ),
    article('VIII', 'INDEMNIFICATION',
      `The Company shall indemnify and hold harmless each Member and manager from any ` +
      `claim, liability, or expense arising out of any act or omission performed in ` +
      `connection with the Company's business, provided such act or omission did not ` +
      `constitute gross negligence or intentional misconduct.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, the Members have executed this Operating Agreement as of the date first written above.`),
    signatureLine(members, 'Member'),
    emptyLine(),
    para('EXHIBIT A — MEMBERS, CAPITAL CONTRIBUTIONS, AND MEMBERSHIP INTERESTS', { bold: true }),
    para('Member Name | Address | Capital Contribution | Membership Interest %'),
    para(`${members} | [Address] | $[Amount] | [___]%`),
  ].join('\n')
}

// ─────────────────────────────────────────
// 9. Articles of Incorporation
// ─────────────────────────────────────────
function buildArticlesOfIncorporation(a: InterviewAnswers, today: string): string {
  const entity   = a.entity_name ?? a.org_name ?? '[Corporation Name]'
  const state    = a.state ?? 'Florida'
  const agent    = a.registered_agent ?? '[Registered Agent Name and Address]'
  const purpose  = a.purpose ?? a.mission_statement ?? 'any lawful business purpose'
  const members  = a.members ?? a.board_members ?? '[Incorporator Name]'

  return [
    heading('ARTICLES OF INCORPORATION', 1),
    heading(`OF ${entity.toUpperCase()}`, 1),
    para(`State of ${state}`, { centered: true }),
    para(`Filed: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `The undersigned, acting as Incorporator under the laws of the State of ${state}, ` +
      `hereby adopts the following Articles of Incorporation.`
    ),
    article('I', 'NAME',
      `The name of this Corporation is: ${entity}.`
    ),
    article('II', 'PURPOSE',
      `The purpose of this Corporation is to engage in ${purpose}. In addition, this ` +
      `Corporation may engage in any lawful act or activity for which corporations may be ` +
      `organized under the ${state} Business Corporation Act.`
    ),
    article('III', 'AUTHORIZED SHARES',
      `The total number of shares of stock this Corporation is authorized to issue is ` +
      `Ten Million (10,000,000) shares of Common Stock, par value $0.001 per share. ` +
      `The Board of Directors may, by resolution, establish classes or series of shares ` +
      `with such rights, preferences, and limitations as permitted by law.`
    ),
    article('IV', 'REGISTERED AGENT',
      `The registered agent for service of process is: ${agent}. ` +
      `The registered agent has consented to serve in this capacity and is authorized ` +
      `to receive service of process on behalf of the Corporation.`
    ),
    article('V', 'BOARD OF DIRECTORS',
      `The business and affairs of the Corporation shall be managed by a Board of Directors. ` +
      `The initial number of directors shall be [Number]. The initial Board of Directors ` +
      `consists of: ${members}. Directors shall serve for one-year terms or until their ` +
      `successors are duly elected and qualified.`
    ),
    article('VI', 'LIABILITY OF DIRECTORS',
      `No director of this Corporation shall be personally liable to the Corporation or ` +
      `its shareholders for monetary damages for any act or omission in such director's ` +
      `capacity as a director, except to the extent otherwise provided by statute.`
    ),
    article('VII', 'INCORPORATOR',
      `The name and address of the Incorporator is: ${members}, [Address].`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`I, the undersigned Incorporator, execute these Articles of Incorporation as of the date first written above.`),
    signatureLine(members, 'Incorporator'),
  ].join('\n')
}

// ─────────────────────────────────────────
// 10. Bylaws
// ─────────────────────────────────────────
function buildBylaws(a: InterviewAnswers, today: string): string {
  const entity   = a.entity_name ?? a.org_name ?? '[Organization Name]'
  const state    = a.state ?? 'Florida'
  const taxYear  = a.tax_year ?? 'December 31'
  const members  = a.members ?? a.board_members ?? '[Officer Name]'

  return [
    heading('BYLAWS', 1),
    heading(`OF ${entity.toUpperCase()}`, 1),
    para(`State of ${state}`, { centered: true }),
    para(`Adopted: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    article('I', 'NAME AND PRINCIPAL OFFICE',
      `The name of this organization is ${entity}. The principal office shall be ` +
      `located at such place as the Board of Directors shall determine. The organization ` +
      `may have such other offices as the Board may designate or as the business of the ` +
      `organization may require from time to time.`
    ),
    article('II', 'BOARD OF DIRECTORS',
      `2.1 General Powers. The affairs of the organization shall be managed by its Board ` +
      `of Directors. The Board shall have all powers necessary to carry out the purposes ` +
      `of the organization.\n` +
      `2.2 Number and Election. The Board shall consist of not fewer than three (3) and ` +
      `not more than fifteen (15) directors. Directors shall be elected by the shareholders ` +
      `(or members) at the annual meeting and shall serve for one-year terms.\n` +
      `2.3 Vacancies. Vacancies on the Board may be filled by a majority vote of the ` +
      `remaining directors. A director elected to fill a vacancy shall serve for the ` +
      `unexpired term of the predecessor.`
    ),
    article('III', 'MEETINGS OF THE BOARD',
      `3.1 Regular Meetings. The Board shall hold regular meetings at least quarterly. ` +
      `Notice of regular meetings shall be given at least five (5) days in advance.\n` +
      `3.2 Special Meetings. Special meetings may be called by the President or by ` +
      `any two directors upon at least two (2) days' notice.\n` +
      `3.3 Quorum. A majority of directors in office shall constitute a quorum for ` +
      `the transaction of business.\n` +
      `3.4 Action by Consent. Directors may act without a meeting by unanimous written consent.`
    ),
    article('IV', 'OFFICERS',
      `4.1 Officers. The officers of the organization shall include a President, ` +
      `Vice President, Secretary, and Treasurer. The Board may create additional offices.\n` +
      `4.2 Election and Term. Officers shall be elected by the Board at its annual meeting ` +
      `and shall serve for one-year terms or until their successors are duly elected.\n` +
      `4.3 Initial Officers. The initial officers of the organization are: ${members}.`
    ),
    article('V', 'SHAREHOLDERS / MEMBERS MEETINGS',
      `5.1 Annual Meeting. The annual meeting shall be held on a date determined by ` +
      `the Board. At the annual meeting, directors shall be elected and other business ` +
      `properly brought before the meeting shall be transacted.\n` +
      `5.2 Notice. Notice of any meeting shall be given at least ten (10) days ` +
      `but not more than sixty (60) days before the meeting.\n` +
      `5.3 Quorum and Voting. A majority of shares entitled to vote shall constitute ` +
      `a quorum. Decisions shall be made by majority vote of shares present.`
    ),
    article('VI', 'FISCAL YEAR AND RECORDS',
      `The fiscal year shall end on ${taxYear} of each year. The Secretary shall maintain ` +
      `minutes of all meetings. The Treasurer shall maintain accurate financial records ` +
      `and present financial reports at each Board meeting.`
    ),
    article('VII', 'INDEMNIFICATION',
      `The organization shall indemnify any director or officer against expenses, ` +
      `judgments, fines, and settlements incurred in connection with any proceeding ` +
      `to which such person was a party by reason of being a director or officer, ` +
      `to the fullest extent permitted by law.`
    ),
    article('VIII', 'AMENDMENT',
      `These Bylaws may be amended or repealed by the affirmative vote of a majority ` +
      `of the Board of Directors at any meeting at which a quorum is present, ` +
      `provided that notice of the proposed amendment was included in the notice of the meeting.`
    ),
    emptyLine(),
    hr(),
    heading('CERTIFICATION', 2),
    para(`I certify that these Bylaws were duly adopted by the Board of Directors of ${entity} on ${today}.`),
    signatureLine('[Secretary Name]', 'Secretary'),
  ].join('\n')
}

// ─────────────────────────────────────────
// 11. Trustee Agreement
// ─────────────────────────────────────────
function buildTrusteeAgreement(a: InterviewAnswers, today: string): string {
  const name      = a.full_name ?? 'Client'
  const state     = a.state ?? 'Florida'
  const trustName = a.trust_name ?? `The ${name} Trust`
  const company   = 'eGrowth Legal LLC'
  const address   = 'Jacksonville, Florida'
  const flatFee   = '$500.00'
  const pctFee    = '1.5%'

  return [
    heading('TRUSTEE SERVICES AGREEMENT', 1),
    para(`Between ${name} and ${company}`, { centered: true, fontSize: 24 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `This Trustee Services Agreement ("Agreement") is entered into as of ${today}, ` +
      `by and between ${name} ("Client") and ${company}, a ${state} limited liability ` +
      `company with its principal place of business at ${address} ("Trustee").`
    ),
    article('I', 'APPOINTMENT',
      `The Client hereby appoints ${company} to serve as Trustee (or Co-Trustee) of ` +
      `the "${trustName}," and ${company} hereby accepts such appointment, subject to ` +
      `the terms and conditions of this Agreement and the applicable trust document. ` +
      `${company} shall serve in a fiduciary capacity and shall be bound by all ` +
      `applicable fiduciary duties under the laws of the State of ${state}.`
    ),
    article('II', 'SCOPE OF TRUSTEE SERVICES',
      `${company} shall provide the following services as Trustee: ` +
      `(a) Accept and take title to trust assets as directed by the Client; ` +
      `(b) Maintain trust records and documentation; ` +
      `(c) Execute legal documents on behalf of the Trust as directed; ` +
      `(d) Coordinate with financial institutions regarding trust assets; ` +
      `(e) Provide annual accountings to the Client; ` +
      `(f) Facilitate asset transfers in and out of the Trust upon written authorization; ` +
      `(g) Maintain the Trust's registered status as required by applicable law.`
    ),
    article('III', 'COMPENSATION',
      `In consideration for the services rendered herein, the Client agrees to pay ` +
      `${company} as follows:\n` +
      `(a) Annual Flat Fee: ${flatFee} per year, billed annually in advance;\n` +
      `(b) Asset-Based Fee: ${pctFee} of the fair market value of trust assets annually, ` +
      `calculated as of December 31 of each year;\n` +
      `(c) Transaction Fees: Additional fees may apply for extraordinary services ` +
      `including real estate transactions, litigation support, and tax preparation, ` +
      `as set forth in the attached Fee Schedule.`
    ),
    article('IV', 'DUTIES AND STANDARD OF CARE',
      `${company} shall act with the care, skill, prudence, and diligence under the ` +
      `circumstances then prevailing that a prudent institutional trustee would use ` +
      `in the conduct of an enterprise of like character. ${company} shall: ` +
      `(a) Maintain loyalty to the beneficiaries; (b) Avoid conflicts of interest; ` +
      `(c) Keep trust assets segregated from company assets; (d) Maintain accurate ` +
      `records and provide accountings as required; (e) Promptly notify the Client ` +
      `of any material matters affecting the Trust.`
    ),
    article('V', 'LIMITATION OF LIABILITY',
      `${company} shall not be personally liable for any loss or depreciation in the ` +
      `value of Trust assets except to the extent such loss or depreciation is caused ` +
      `by ${company}'s own gross negligence or willful misconduct. ${company} shall ` +
      `not be required to take any action that would expose it to personal liability ` +
      `unless provided with adequate indemnification.`
    ),
    article('VI', 'TERM AND TERMINATION',
      `This Agreement shall continue until terminated by either party upon thirty (30) ` +
      `days' written notice. Upon termination, ${company} shall execute all documents ` +
      `necessary to transfer trust assets and records to a successor trustee designated ` +
      `by the Client.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, the parties have executed this Trustee Services Agreement as of the date first written above.`),
    signatureLine(name, 'Client'),
    signatureLine(`${company}, by its authorized representative`, 'Trustee'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 12. File Custody Agreement
// ─────────────────────────────────────────
function buildFileCustodyAgreement(a: InterviewAnswers, today: string): string {
  const name    = a.full_name ?? 'Client'
  const state   = a.state ?? 'Florida'
  const company = 'eGrowth Legal LLC'
  const address = 'Jacksonville, Florida'

  return [
    heading('FILE CUSTODY AND RECORD-KEEPING AGREEMENT', 1),
    para(`Between ${name} and ${company}`, { centered: true, fontSize: 24 }),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `This File Custody and Record-Keeping Agreement ("Agreement") is entered into as ` +
      `of ${today}, by and between ${name} ("Client") and ${company}, a ${state} limited ` +
      `liability company with its principal place of business at ${address} ("Custodian").`
    ),
    article('I', 'PURPOSE',
      `The purpose of this Agreement is to establish the terms and conditions under which ` +
      `${company} shall serve as the designated custodian for the Client's original legal ` +
      `documents, trust records, corporate records, and related legal files ` +
      `(collectively, "Client Documents").`
    ),
    article('II', 'DOCUMENTS IN CUSTODY',
      `The following categories of documents shall be placed in the custody of ${company}: ` +
      `(a) Original executed trust agreements and amendments; ` +
      `(b) Original executed wills and codicils; ` +
      `(c) Corporate formation documents and minutes; ` +
      `(d) Original powers of attorney and healthcare directives; ` +
      `(e) Real property deeds and related instruments; ` +
      `(f) Any other documents designated by the Client in a Schedule of Documents ` +
      `maintained by ${company}.`
    ),
    article('III', 'CUSTODY AND SAFEKEEPING',
      `${company} shall maintain Client Documents in a secure, climate-controlled ` +
      `environment. ${company} shall maintain a digital inventory of all Client Documents ` +
      `held in custody. Client Documents shall be stored separately from those of ` +
      `other clients. ${company} shall not release, copy, or provide access to Client ` +
      `Documents to any third party without the express written authorization of the Client, ` +
      `except as required by court order or applicable law.`
    ),
    article('IV', 'ACCESS AND RETRIEVAL',
      `The Client may access Client Documents at any time during regular business hours ` +
      `upon reasonable prior notice. Document retrieval requests shall be honored within ` +
      `three (3) business days of written request. Copies of documents shall be provided ` +
      `at the Client's reasonable request. Return of original documents shall require ` +
      `written authorization and a signed receipt.`
    ),
    article('V', 'FEES',
      `The custody services provided herein shall be included in the annual Trustee ` +
      `Services fee, or as otherwise agreed in writing. Additional charges may apply ` +
      `for delivery of physical documents, expedited retrieval, and certified copies.`
    ),
    article('VI', 'CONFIDENTIALITY',
      `${company} shall maintain the strict confidentiality of all Client Documents ` +
      `and information contained therein. ${company} personnel who have access to ` +
      `Client Documents shall be bound by confidentiality obligations. ` +
      `This obligation of confidentiality shall survive the termination of this Agreement.`
    ),
    article('VII', 'TERM AND RETURN OF DOCUMENTS',
      `This Agreement shall continue until terminated by either party upon thirty (30) ` +
      `days' written notice. Upon termination, ${company} shall return all original ` +
      `Client Documents to the Client or to a designated successor custodian. ` +
      `${company} shall retain a complete set of digital copies of all documents ` +
      `for a period of seven (7) years following termination.`
    ),
    emptyLine(),
    hr(),
    heading('EXECUTION', 2),
    para(`IN WITNESS WHEREOF, the parties have executed this File Custody Agreement as of the date first written above.`),
    signatureLine(name, 'Client'),
    signatureLine(`${company}, by its authorized representative`, 'Custodian'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// 13. Fee Schedule
// ─────────────────────────────────────────
function buildFeeSchedule(a: InterviewAnswers, today: string): string {
  const name    = a.full_name ?? 'Client'
  const company = 'eGrowth Legal LLC'
  const flatFee = '$500.00'
  const pctFee  = '1.5%'

  return [
    heading(`${company.toUpperCase()}`, 1),
    heading('SCHEDULE OF FEES AND SERVICES', 1),
    para(`Prepared for: ${name}`, { centered: true, fontSize: 24 }),
    para(`Effective: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `This Fee Schedule sets forth the fees and charges applicable to services provided ` +
      `by ${company} to its clients. All fees are subject to change upon thirty (30) ` +
      `days' written notice.`
    ),
    heading('DOCUMENT PREPARATION SERVICES', 2),
    para('Trust & Estate Package (includes all documents below):', { bold: true }),
    para('  • Revocable Living Trust'),
    para('  • Pour-Over Will'),
    para('  • Durable Power of Attorney'),
    para('  • Healthcare Directive / Living Will'),
    para('  • HIPAA Authorization'),
    para('  • Land Trust (if applicable)'),
    para(`Package Fee: $2,500.00 (one-time)`),
    emptyLine(),
    para('Business Formation Package (includes all documents below):', { bold: true }),
    para('  • Articles of Organization or Articles of Incorporation'),
    para('  • Operating Agreement or Bylaws'),
    para('  • Initial Resolutions'),
    para('  • EIN Application assistance'),
    para(`Package Fee: $1,500.00 (one-time)`),
    emptyLine(),
    para('Individual Document Preparation:', { bold: true }),
    para('  • Any single trust or estate document: $500.00'),
    para('  • Any single business formation document: $350.00'),
    para('  • Document amendment or restatement: $250.00'),
    emptyLine(),
    heading('TRUSTEE SERVICES', 2),
    para('Annual Trustee Fee Structure:', { bold: true }),
    para(`  • Annual Flat Fee: ${flatFee} per trust per year`),
    para(`  • Asset-Based Fee: ${pctFee} of trust assets under management annually`),
    para('  • Minimum Annual Fee: $500.00'),
    para('  • Maximum Annual Fee: $10,000.00 (unless otherwise agreed)'),
    emptyLine(),
    heading('TRANSACTION AND SUPPLEMENTAL FEES', 2),
    para('Real Estate Transactions (per transaction):', { bold: true }),
    para('  • Deed preparation and recording: $300.00'),
    para('  • Real property transfer to trust: $400.00'),
    para('  • Refinance cooperation: $250.00'),
    emptyLine(),
    para('Other Services:', { bold: true }),
    para('  • Notarization (per document): $25.00'),
    para('  • Document certification: $50.00'),
    para('  • Expedited preparation (48-hour): additional 50% of base fee'),
    para('  • Consultation (hourly): $150.00/hour'),
    para('  • Annual trust review meeting: $200.00'),
    emptyLine(),
    heading('PAYMENT TERMS', 2),
    para(
      `All fees are due and payable as follows: Document preparation fees are due upon ` +
      `completion of documents. Annual trustee fees are billed in advance annually. ` +
      `Transaction fees are due upon completion of the transaction. Payment may be made ` +
      `by credit card, ACH transfer, or check payable to ${company}. A late payment ` +
      `fee of 1.5% per month shall apply to balances unpaid after 30 days.`
    ),
    emptyLine(),
    para('CLIENT ACKNOWLEDGMENT:', { bold: true }),
    para(`I, ${name}, acknowledge receipt of this Fee Schedule and agree to the fees and terms set forth herein.`),
    signatureLine(name, 'Client'),
    emptyLine(),
    para(`${company}:`, { bold: true }),
    signatureLine(`${company}, Authorized Representative`, 'Service Provider'),
  ].join('\n')
}

// ─────────────────────────────────────────
// Generic fallback builder
// ─────────────────────────────────────────
function buildGenericDoc(docType: string, a: InterviewAnswers, today: string): string {
  const name  = a.full_name ?? 'Client Name'
  const state = a.state ?? 'Florida'

  return [
    heading(docType.toUpperCase(), 1),
    para(`State of ${state}`, { centered: true }),
    para(`Dated: ${today}`, { centered: true }),
    hr(),
    emptyLine(),
    para(
      `KNOW ALL MEN BY THESE PRESENTS, that this ${docType} is executed by ${name} ` +
      `as of ${today}, in the State of ${state}, for the purposes set forth herein.`
    ),
    emptyLine(),
    para('This document was prepared by eGrowth Legal LLC and must be reviewed by a licensed attorney before execution.'),
    signatureLine(name, 'Principal'),
    notaryBlock(state),
  ].join('\n')
}

// ─────────────────────────────────────────
// Open XML Boilerplate Constants
// ─────────────────────────────────────────

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
