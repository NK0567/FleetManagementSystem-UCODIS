import { useConfigurationStore } from '../stores/configuration'

/** Monnaie de l'entreprise, réglée dans Configuration, onglet Paramètres. */
export const devise = () => useConfigurationStore().devise()
/** Montant formaté dans la monnaie de l'entreprise. */
export const fmtMontant = (n: number | null | undefined) => useConfigurationStore().montant(n)
