import type { Component } from 'vue'
import type { CrudService } from '@/core/types/crud.types'

export interface SearchHit {
  id: string
  title: string
  subtitle?: string
}

export interface SearchableEntityDefinition<T, SearchCol extends string> {
  key: string
  labelKey: string
  icon: Component
  basePath: string
  searchColumns: SearchCol
  service: Pick<CrudService<T, SearchCol>, 'getAll'>
  toHit: (item: T) => SearchHit
}

export interface SearchableEntity {
  key: string
  labelKey: string
  icon: Component
  search: (query: string, limit: number) => Promise<SearchHit[]>
  /** Cards open as overlays on their list, through ?no=. */
  route: (id: string) => string
}

const searchableEntities: SearchableEntity[] = []

/** Called by each module for the entities offered in the command palette. */
export function registerSearchableEntity<T, SearchCol extends string>(
  definition: SearchableEntityDefinition<T, SearchCol>
): void {
  if (searchableEntities.some((entity) => entity.key === definition.key)) return
  searchableEntities.push({
    key: definition.key,
    labelKey: definition.labelKey,
    icon: definition.icon,
    async search(query, limit) {
      const response = await definition.service.getAll({
        page: 1,
        pageSize: limit,
        searchQuery: query,
        searchColumns: definition.searchColumns
      })
      return response.data.items.map(definition.toHit)
    },
    route: (id) => `${definition.basePath}?no=${encodeURIComponent(id)}`
  })
}

export function getSearchableEntities(): readonly SearchableEntity[] {
  return searchableEntities
}
