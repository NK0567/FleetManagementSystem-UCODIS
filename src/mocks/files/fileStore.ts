/** Where the mock server keeps file contents: IndexedDB in the browser, memory in specs. */
export interface FileStore {
  put(no: string, blob: Blob): Promise<void>
  get(no: string): Promise<Blob | undefined>
  remove(no: string): Promise<void>
  clear(): Promise<void>
}

export function memoryFileStore(): FileStore {
  const files = new Map<string, Blob>()
  return {
    put: async (no, blob) => void files.set(no, blob),
    get: async (no) => files.get(no),
    remove: async (no) => void files.delete(no),
    clear: async () => files.clear()
  }
}

const DATABASE = 'fms-mock-files'
const STORE = 'files'

function request<T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode) {
  return new Promise<T>((resolve, reject) => {
    const opening = indexedDB.open(DATABASE, 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore(STORE)
    opening.onerror = () => reject(opening.error)
    opening.onsuccess = () => {
      const database = opening.result
      const action = run(database.transaction(STORE, mode).objectStore(STORE))
      action.onsuccess = () => {
        database.close()
        resolve(action.result)
      }
      action.onerror = () => {
        database.close()
        reject(action.error)
      }
    }
  })
}

/** IndexedDB holds binary files far beyond the few megabytes of localStorage. */
export function indexedDbFileStore(): FileStore {
  return {
    put: async (no, blob) => void (await request((store) => store.put(blob, no), 'readwrite')),
    get: async (no) => (await request((store) => store.get(no), 'readonly')) as Blob | undefined,
    remove: async (no) => void (await request((store) => store.delete(no), 'readwrite')),
    clear: async () => void (await request((store) => store.clear(), 'readwrite'))
  }
}

export function createFileStore(): FileStore {
  return typeof indexedDB === 'undefined' ? memoryFileStore() : indexedDbFileStore()
}
