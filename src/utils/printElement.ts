/**
 * Prints one part of the page as a plain document (a pickup note, a loading list): it is
 * copied into a blank window with simple black-and-white styles, then the print dialog opens.
 */
export function printElement(element: HTMLElement | null, title: string): boolean {
  if (!element) return false
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return false
  const style = `
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; font-size: 12px; }
    h1, h2, h3 { margin: 0 0 6px; } table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
    .text-right { text-align: right; } .print-hide { display: none !important; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 6px 0; }
    dt { color: #555; } dd { margin: 0; }`
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${style}</style></head><body>${element.outerHTML}</body></html>`
  )
  win.document.close()
  win.focus()
  win.print()
  return true
}
