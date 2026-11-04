import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * vue-i18n reads an « @ » followed by a letter as a linked message and fails to compile the
 * text, which breaks the screen that shows it (the e-mail dialog of the fleet status). An address
 * written in a message has to be escaped as {'@'}.
 */
describe('locale messages', () => {
  it('never carry an unescaped @ inside an address', () => {
    const offenders: string[] = []
    for (const lang of ['fr', 'en']) {
      const dir = join(__dirname, lang)
      for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
        readFileSync(join(dir, file), 'utf8')
          .split('\n')
          .forEach((line, index) => {
            if (/[A-Za-z0-9.]@[A-Za-z]/.test(line.replace(/\{'@'\}/g, ''))) {
              offenders.push(`${lang}/${file}:${index + 1}`)
            }
          })
      }
    }
    expect(offenders).toEqual([])
  })
})
