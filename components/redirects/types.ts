export type RedirectRecord = {
  id: string
  source: string
  destination: string
  is_permanent: boolean | null
  is_active: boolean | null
  note: string | null
  created_at: string | null
  updated_at: string | null
}

export type RedirectFormState = {
  source: string
  destination: string
  is_permanent: boolean
  is_active: boolean
  note: string
}

export const EMPTY_REDIRECT_FORM: RedirectFormState = {
  source: '',
  destination: '',
  is_permanent: true,
  is_active: true,
  note: '',
}

export function redirectToForm(row: RedirectRecord): RedirectFormState {
  return {
    source: row.source ?? '',
    destination: row.destination ?? '',
    is_permanent: row.is_permanent ?? true,
    is_active: row.is_active ?? true,
    note: row.note ?? '',
  }
}
