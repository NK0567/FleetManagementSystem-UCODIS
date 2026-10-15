import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { RoleUtilisateur } from '../types'
import { LIBELLE_ROLE } from './auth'
import { useUtilisateurStore } from './utilisateurs'
import { usePersonnelStore } from './personnel'

/**
 * Adresses de notification (FMS-PA-06) : chaque rôle a son adresse e-mail et
 * son numéro de téléphone. Une alerte envoyée par e-mail ou par SMS part vers
 * les rôles cochés dans sa règle (Configuration > Sécurité > Règles d'alerte).
 * Le code d'indisponibilité appliqué au véhicule se règle aussi ici.
 */
export interface ContactRole { email: string; telephone: string }
/** Rôles côté gestion qui peuvent recevoir une alerte. */
export const ROLES_NOTIFIES: RoleUtilisateur[] = ['responsable_flotte', 'maintenancier', 'direction', 'charge_clientele', 'commercial', 'depot']
export interface ReglesDocuments {
  contacts: Partial<Record<RoleUtilisateur, ContactRole>>
  codeIndispoReglementaire: string
  /** Anciens réglages (liste globale et canaux des documents), lus une fois pour migration. */
  emails?: string[]
  telephones?: string[]
  envoiEmail?: boolean
  envoiSms?: boolean
}
const CLE = 'fms-ucodis-regles-documents'
/** Ancienne valeur proposée par défaut pour la liste globale. */
const ANCIEN_EMAIL_DEFAUT = 'flotte@entreprise.mg'

export const useReglesDocumentsStore = defineStore('reglesDocuments', () => {
  /** Valeurs de départ : l'e-mail et le téléphone de la fiche du personnel reliée au compte du rôle. */
  function contactsDepart(): Partial<Record<RoleUtilisateur, ContactRole>> {
    const utilisateurs = useUtilisateurStore(); const personnel = usePersonnelStore()
    const res: Partial<Record<RoleUtilisateur, ContactRole>> = {}
    ROLES_NOTIFIES.forEach(role => {
      const u = utilisateurs.liste.find(x => x.role === role && x.actif)
      const p = u ? personnel.liste.find(x => x.id === u.personnelId) : undefined
      res[role] = { email: p?.email ?? '', telephone: p?.telephone ?? '' }
    })
    return res
  }
  const parametres = ref<ReglesDocuments>({ contacts: contactsDepart(), codeIndispoReglementaire: 'DOC' })
  try {
    const b = localStorage.getItem(CLE)
    if (b) {
      const lu = JSON.parse(b) as ReglesDocuments
      const contacts = { ...parametres.value.contacts, ...(lu.contacts ?? {}) }
      /* Migration de l'ancienne liste globale : elle allait à toutes les alertes,
       * elle est reprise pour le responsable flotte, destinataire de toutes les règles par défaut. */
      if (!lu.contacts) {
        const rf = contacts.responsable_flotte ?? { email: '', telephone: '' }
        const emails = (lu.emails ?? []).filter(e => e !== ANCIEN_EMAIL_DEFAUT || (lu.emails ?? []).length > 1)
        contacts.responsable_flotte = {
          email: emails.length ? emails.join(', ') : rf.email,
          telephone: lu.telephones?.length ? lu.telephones.join(', ') : rf.telephone,
        }
      }
      parametres.value = { ...lu, contacts, codeIndispoReglementaire: lu.codeIndispoReglementaire ?? 'DOC' }
      delete parametres.value.emails; delete parametres.value.telephones
    }
  } catch { /* défaut */ }
  watch(parametres, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const telephoneValide = (t: string) => /^\+?[\d\s]{8,16}$/.test(t)
  const morceaux = (v: string) => v.split(',').map(x => x.trim()).filter(Boolean)

  /** Modifie l'adresse e-mail ou le téléphone d'un rôle ; vide = aucun envoi pour ce rôle. */
  function modifierContact(role: RoleUtilisateur, champ: keyof ContactRole, valeur: string): { ok: boolean; motif?: string } {
    const liste = morceaux(valeur)
    if (champ === 'email' && liste.some(e => !emailValide(e))) return { ok: false, motif: `Adresse e-mail invalide pour ${LIBELLE_ROLE[role]}.` }
    if (champ === 'telephone' && liste.some(t => !telephoneValide(t))) return { ok: false, motif: `Numéro de téléphone invalide pour ${LIBELLE_ROLE[role]}.` }
    if (new Set(liste).size !== liste.length) return { ok: false, motif: `Valeur en double pour ${LIBELLE_ROLE[role]}.` }
    const c = parametres.value.contacts[role] ?? { email: '', telephone: '' }
    parametres.value.contacts[role] = { ...c, [champ]: liste.join(', ') }
    return { ok: true }
  }
  function reinitialiserContacts() { parametres.value.contacts = contactsDepart() }

  /** Diffusion d'une alerte : dans l'application, puis par e-mail et SMS aux rôles cochés de la règle. */
  function diffusion(email: boolean, sms: boolean, roles: RoleUtilisateur[]): string {
    const parties = ["dans l'application"]
    const vers = (champ: keyof ContactRole) => roles.map(r => {
      const v = parametres.value.contacts[r]?.[champ]
      return v ? `${LIBELLE_ROLE[r]} (${v})` : `${LIBELLE_ROLE[r]} (${champ === 'email' ? 'aucune adresse' : 'aucun numéro'})`
    }).join(', ')
    if (email) parties.push(`par e-mail à ${vers('email')}`)
    if (sms) parties.push(`par SMS à ${vers('telephone')}`)
    return parties.join(', ')
  }
  return { parametres, modifierContact, reinitialiserContacts, diffusion, emailValide, telephoneValide }
})
