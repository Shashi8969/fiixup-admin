import type { SchemaEntityType } from '@/utils/schema/schemaTypes'

// Which schema.org properties can be overridden per entity type, and which
// selected type(s) make that field relevant. Drives SchemaMultiSelector's
// override inputs — add a field here and it shows up automatically for any
// page where a relevant type is selected, instead of hard-coding inputs.
export type SchemaFieldDef = {
  key: string
  label: string
  placeholder: string
  appliesTo: SchemaEntityType[]
}

export const SCHEMA_OVERRIDE_FIELDS: SchemaFieldDef[] = [
  {
    key: 'name',
    label: 'Name / Headline',
    placeholder: 'Auto-filled from the page title or service name',
    appliesTo: ['WebPage', 'LocalBusiness', 'Service', 'Article', 'BlogPosting', 'HowTo'],
  },
  {
    key: 'description',
    label: 'Description',
    placeholder: 'Auto-filled from the meta description or intro text',
    appliesTo: ['WebPage', 'LocalBusiness', 'Service', 'Article', 'BlogPosting', 'HowTo'],
  },
  {
    key: 'telephone',
    label: 'Telephone',
    placeholder: 'Auto-filled from the city/business phone number',
    appliesTo: ['LocalBusiness'],
  },
  {
    key: 'image',
    label: 'Image URL',
    placeholder: 'Auto-filled from the page image or site default',
    appliesTo: ['LocalBusiness', 'Article', 'BlogPosting'],
  },
  {
    key: 'totalTime',
    label: 'HowTo Total Time',
    placeholder: 'ISO 8601 duration, e.g. PT30M',
    appliesTo: ['HowTo'],
  },
  {
    key: 'estimatedCost',
    label: 'HowTo Estimated Cost (INR)',
    placeholder: 'e.g. 499',
    appliesTo: ['HowTo'],
  },
]

export function overrideFieldsFor(selectedTypes: SchemaEntityType[]): SchemaFieldDef[] {
  return SCHEMA_OVERRIDE_FIELDS.filter((field) => field.appliesTo.some((t) => selectedTypes.includes(t)))
}

// Non-blocking checks — flags the exact placeholder/empty patterns that
// caused real Google Search Console errors this session (empty telephone,
// missing image, missing postal code). Never blocks Save; just surfaces
// what would otherwise ship silently.
export function validateSchemaGraph(graph: Record<string, unknown>[]): string[] {
  const warnings: string[] = []

  for (const node of graph) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
    if (!types.includes('LocalBusiness')) continue

    if (!String(node.telephone ?? '').trim()) {
      warnings.push('LocalBusiness is missing a telephone number.')
    }
    if (!String(node.image ?? '').trim()) {
      warnings.push('LocalBusiness is missing an image.')
    }
    const address = node.address as Record<string, unknown> | undefined
    if (!address || !String(address.postalCode ?? '').trim()) {
      warnings.push('LocalBusiness address is missing a postal code.')
    }
  }

  return warnings
}
