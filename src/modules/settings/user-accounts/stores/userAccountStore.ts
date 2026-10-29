import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { userAccountService } from '../services/userAccountService'
import type { UserAccountApi, UserAccountSearchColumn } from '../types/userAccount.types'

export type UserAccountListView = 'active' | 'disabled' | 'all'

function viewFilters(view: UserAccountListView): ListFilter[] {
  if (view === 'all') return []
  return [{ field: 'active', valueType: 'boolean', value: view === 'active' }]
}

function detectView(filters: ListFilter[]): UserAccountListView {
  const filter = filters.find((candidate) => candidate.field === 'active')
  if (!filter) return 'all'
  return String(filter.value) === 'true' ? 'active' : 'disabled'
}

export const useUserAccountStore = defineStore('settings-user-account', () => {
  const crud = useCrudState<UserAccountApi, UserAccountSearchColumn>({
    persistKey: 'settings-user-account',
    service: userAccountService,
    defaultSearchColumn: 'no,name,email',
    entityLabelKey: 'settings.userAccounts.title',
    defaultSortBy: 'no'
  })

  const { listView, setListView } = makeViewAsFilters<UserAccountListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['active'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
