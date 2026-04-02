// ─────────────────────────────────────────
// eGrowth DOCX Generation Engine
// Fills .docx templates with interview answers → returns Buffer
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

      // Check if template exists; if not, generate a placeholder
      let buffer: Buffer
      try {
        const content = await fs.readFile(templatePath)
        buffer = await fillTemplate(content, templateData)
      } catch {
        // Template doesn't exist yet — generate a rich placeholder DOCX
        buffer = await generatePlaceholderDoc(docType, answers, today)
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
    // Client
    full_name:        answers.full_name ?? '',
    email:            answers.email ?? '',
    phone:            answers.phone ?? '',
    dob:              answers.dob ?? '',
    state:            answers.state ?? '',
    date_today:       today,

    // Trust & Estate
    trust_name:                answers.trust_name ?? '',
    trust_type:                answers.trust_type ?? '',
    successor_trustee_name:    answers.successor_trustee_name ?? '',
    successor_trustee_relation:answers.successor_trustee_relation ?? '',
    beneficiaries:             answers.beneficiaries ?? '',

    // For-Profit
    entity_name:       answers.entity_name ?? '',
    entity_type:       answers.entity_type ?? '',
    registered_agent:  answers.registered_agent ?? '',
    members:           answers.members ?? '',
    purpose:           answers.purpose ?? '',

    // Nonprofit
    org_name:          answers.org_name ?? '',
    mission_statement: answers.mission_statement ?? '',
    board_members:     answers.board_members ?? '',
    tax_year:          answers.tax_year ?? '',

    // Trustee
    trustee_company:   'eGrowth Legal LLC',
    trustee_address:   'Jacksonville, Florida',
    flat_fee:          '$500.00',
    pct_fee:           '1.5%',
    special_instructions: answers.special_instructions ?? 'None',
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

// Generates a proper DOCX with content when no template file exists yet
async function generatePlaceholderDoc(
  docType: string,
  answers: InterviewAnswers,
  today: string
): Promise<Buffer> {
  // Build a basic DOCX from scratch using raw Open XML
  const clientName = answers.full_name ?? 'Client Name'
  const state      = answers.state ?? 'Florida'

  const bodyXml = `
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escapeXml(docType.toUpperCase())}</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>State of ${escapeXml(state)}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Date: </w:t></w:r>
      <w:r><w:t>${escapeXml(today)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Grantor / Principal: </w:t></w:r>
      <w:r><w:t>${escapeXml(clientName)}</w:t></w:r>
    </w:p>
    ${answers.trust_name ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Trust Name: </w:t></w:r><w:r><w:t>${escapeXml(answers.trust_name)}</w:t></w:r></w:p>` : ''}
    ${answers.entity_name ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Entity Name: </w:t></w:r><w:r><w:t>${escapeXml(answers.entity_name)}</w:t></w:r></w:p>` : ''}
    ${answers.org_name ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Organization: </w:t></w:r><w:r><w:t>${escapeXml(answers.org_name)}</w:t></w:r></w:p>` : ''}
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>This document was prepared by eGrowth Legal LLC on behalf of ${escapeXml(clientName)}. </w:t></w:r>
      <w:r><w:t>It is generated for review and must be reviewed by a licensed attorney before execution.</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>SIGNATURE BLOCK</w:t></w:r></w:p>
    <w:p><w:r><w:t>_______________________________          Date: _______________</w:t></w:r></w:p>
    <w:p><w:r><w:t>${escapeXml(clientName)}, Grantor</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>_______________________________          Date: _______________</w:t></w:r></w:p>
    <w:p><w:r><w:t>Notary Public, State of ${escapeXml(state)}</w:t></w:r></w:p>
  `

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

function escapeXml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
}

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
