/** One value of an enumerated field, with its label in the current language. */
export interface EnrichOption {
  value: string | number
  description: string
}

/** Enumerations served by GET /options/all, keyed by option set name. */
export type OptionsData = Record<string, EnrichOption[]>
