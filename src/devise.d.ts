export {}
declare module 'vue' {
  interface ComponentCustomProperties {
    /** Monnaie de l'entreprise, réglée dans la configuration. */
    $devise: () => string
  }
}
