<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { NavMenuItem, NavSubItem } from '@/core/navigation/moduleRegistry'
import { useUserStore } from '@/stores/user'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import { ChevronDown, ChevronLeft, ChevronRight } from '@lucide/vue'
import { appConfig } from '@/core/app/appConfig'
import logo from '@/assets/logo-ucodis.png'

const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()
const menuPermissionsStore = useMenuPermissionsStore()

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function isRouteMatch(to?: string): boolean {
  if (!to) return false
  const current = normalizePath(route.path)
  const target = normalizePath(to)
  return current === target || current.startsWith(`${target}/`)
}

/** Among sibling entries, only the closest match is active (`/a/b` wins over `/a`). */
function isSubItemActive(menu: NavMenuItem, to?: string): boolean {
  if (!to || !isRouteMatch(to)) return false
  return !menu.subItems.some(
    (item) => !!item.to && item.to.length > to.length && isRouteMatch(item.to)
  )
}

function isMenuActive(menu: NavMenuItem): boolean {
  if (menu.to && isRouteMatch(menu.to)) return true
  return menu.subItems.some((item) => !!item.to && isRouteMatch(item.to))
}

const navMenus = computed<NavMenuItem[]>(() => menuPermissionsStore.navMenus)

const orgUnitLabel = computed(() => userStore.user?.orgUnitName ?? '')

const openMenuIndex = ref<number | null>(null)

const navScrollEl = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const menuTriggerEls = ref<Array<HTMLElement | null>>([])
const dropdownPanelRef = ref<HTMLElement | null>(null)
const viewportWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1024)
const dropdownPos = ref<{ left: number; top: number; width: number }>({
  left: 0,
  top: 0,
  width: 660
})
const dropdownCols = ref<1 | 2 | 3 | 4>(3)
const dropdownTruncate = ref(false)

const DROPDOWN_GUTTER_PX = 8
const DROPDOWN_MIN_COL_WIDTH_PX = 180

/** The entries of a menu grouped by capability, in the order their first entry appears. */
function sectionsOf(menu: NavMenuItem): { group: string; items: NavSubItem[] }[] {
  const byGroup = new Map<string, NavSubItem[]>()
  for (const item of menu.subItems) {
    const key = item.group ?? ''
    byGroup.set(key, [...(byGroup.get(key) ?? []), item])
  }
  return [...byGroup].map(([group, items]) => ({ group, items }))
}

function setMenuTriggerEl(index: number, el: HTMLElement | null) {
  menuTriggerEls.value[index] = el
}

function setDropdownPanelEl(el: Element | null) {
  dropdownPanelRef.value = el as HTMLElement | null
}

function measureContentColWidth(): number {
  const panel = dropdownPanelRef.value
  if (!panel) return DROPDOWN_MIN_COL_WIDTH_PX
  const sample = panel.querySelector('a')
  if (!sample) return DROPDOWN_MIN_COL_WIDTH_PX

  const style = getComputedStyle(sample)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return DROPDOWN_MIN_COL_WIDTH_PX

  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)

  let max = DROPDOWN_MIN_COL_WIDTH_PX
  for (const link of panel.querySelectorAll<HTMLElement>('a')) {
    const text = link.textContent?.trim() ?? ''
    max = Math.max(max, Math.ceil(ctx.measureText(text).width + padX))
  }
  return max
}

function updateDropdownPosition() {
  const idx = openMenuIndex.value
  if (idx == null) return
  const trigger = menuTriggerEls.value[idx]
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const gutter = DROPDOWN_GUTTER_PX
  const maxWidth = Math.max(280, viewportWidth.value - gutter * 2)

  const contentColWidth = measureContentColWidth()
  const menu = navMenus.value[idx]
  const sectionCount = menu ? sectionsOf(menu).length : 3
  const wanted = sectionCount > 1 ? Math.min(4, sectionCount) : 3
  const cols = Math.min(wanted, Math.max(1, Math.floor(maxWidth / contentColWidth))) as
    | 1
    | 2
    | 3
    | 4
  dropdownCols.value = cols

  const idealWidth = cols * contentColWidth
  const width = Math.min(maxWidth, Math.max(Math.round(rect.width), idealWidth))
  const colWidth = width / cols
  dropdownTruncate.value = colWidth + 0.5 < contentColWidth

  const maxLeft = viewportWidth.value - width - gutter
  const left = Math.min(
    Math.max(Math.round(rect.left), gutter),
    Math.max(gutter, Math.round(maxLeft))
  )

  dropdownPos.value = {
    left,
    top: Math.round(rect.bottom + 2),
    width
  }
}

function updateNavScrollIndicators() {
  const el = navScrollEl.value
  if (!el) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollNavBy(direction: -1 | 1) {
  const el = navScrollEl.value
  if (!el) return
  const amount = Math.max(240, Math.floor(el.clientWidth * 0.6))
  el.scrollBy({ left: direction * amount, behavior: 'smooth' })
}

const toggleMenu = (index: number) => {
  if (!navMenus.value[index]?.subItems.length) return
  openMenuIndex.value = openMenuIndex.value === index ? null : index
}

const closeMenu = () => {
  openMenuIndex.value = null
}

function onDocumentClick(e: MouseEvent) {
  if (openMenuIndex.value === null) return
  const target = e.target as HTMLElement
  if (target.closest('.nav-menu-item')) return
  if (dropdownPanelRef.value?.contains(target)) return
  closeMenu()
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

function onWindowResize() {
  viewportWidth.value = window.innerWidth
  updateNavScrollIndicators()
  updateDropdownPosition()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('resize', updateNavScrollIndicators)
  window.addEventListener('resize', onWindowResize)

  nextTick(() => {
    viewportWidth.value = window.innerWidth
    updateNavScrollIndicators()
    updateDropdownPosition()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('resize', updateNavScrollIndicators)
  window.removeEventListener('resize', onWindowResize)
})

watch(openMenuIndex, async (idx) => {
  if (idx == null) {
    dropdownTruncate.value = false
    return
  }
  await nextTick()
  updateDropdownPosition()
  await nextTick()
  updateDropdownPosition()
})
</script>

<template>
  <header class="shadow-xs shrink-0 z-30 relative">
    <div class="bg-white border-b border-gray-200 px-0 sm:px-2 md:px-4 lg:px-14 xl:px-16">
      <div class="flex items-center px-4 py-2">
        <div class="flex items-center gap-8 flex-1 min-w-0">
          <router-link
            to="/"
            class="inline-flex items-center gap-2 text-base font-semibold text-gray-900 whitespace-nowrap hover:text-gray-700 cursor-pointer transition-colors hover:underline shrink-0"
          >
            <img :src="logo" :alt="appConfig.companyName" class="h-7" />
            <span
              class="pt-1 text-base font-semibold text-gray-900 whitespace-nowrap hover:text-gray-700 cursor-pointer transition-colors hover:underline shrink-0"
            >
              {{ appConfig.companyName }}
            </span>
          </router-link>

          <div class="h-4 w-px bg-gray-200"></div>

          <div class="nav-scroll relative flex-1 min-w-0">
            <button
              type="button"
              :disabled="!canScrollLeft"
              class="nav-scroll-btn nav-scroll-btn--left"
              @click="scrollNavBy(-1)"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>

            <nav
              ref="navScrollEl"
              class="nav-scroll-area flex items-center gap-0 overflow-x-auto overflow-y-visible flex-1 min-w-0"
              @scroll="
                () => {
                  updateNavScrollIndicators()
                  updateDropdownPosition()
                }
              "
            >
              <div
                v-for="(menu, index) in navMenus"
                :key="`${menu.labelKey}-${menu.order}-${index}`"
                class="nav-menu-item relative"
              >
                <router-link
                  v-if="menu.to && menu.subItems.length === 0"
                  :to="menu.to"
                  :class="[
                    'nav-top-link px-3 py-2 text-sm rounded flex items-center gap-1 whitespace-nowrap transition-colors text-gray-700 hover:bg-gray-100',
                    isRouteMatch(menu.to) ? 'nav-top-link--active' : ''
                  ]"
                  @click="closeMenu"
                >
                  {{ t(menu.labelKey) }}
                </router-link>
                <button
                  v-else
                  type="button"
                  :class="[
                    'nav-top-link px-3 py-2 text-sm rounded flex items-center gap-1 whitespace-nowrap transition-colors',
                    openMenuIndex === index
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100',
                    isMenuActive(menu) ? 'nav-top-link--active' : ''
                  ]"
                  :ref="(el) => setMenuTriggerEl(index, el as HTMLElement | null)"
                  @click.stop="toggleMenu(index)"
                >
                  {{ t(menu.labelKey) }}
                  <ChevronDown
                    v-if="menu.subItems.length > 0"
                    :class="[
                      'w-3 h-3 transition-transform',
                      openMenuIndex === index ? 'text-gray-600 rotate-180' : 'text-gray-400'
                    ]"
                  />
                </button>

                <teleport to="body">
                  <transition name="dropdown-fade">
                    <div
                      v-if="openMenuIndex === index && menu.subItems.length > 0"
                      :ref="(el) => setDropdownPanelEl(el as Element | null)"
                      class="fixed mt-0.5 z-9999"
                      :style="{
                        left: `${dropdownPos.left}px`,
                        top: `${dropdownPos.top}px`,
                        width: `${dropdownPos.width}px`,
                        maxWidth: `calc(100vw - 16px)`
                      }"
                    >
                      <div
                        class="bg-white rounded-b-md border border-gray-200 shadow-lg py-2 grid gap-0 max-h-[75vh] overflow-y-auto"
                        :class="{
                          'grid-cols-1': dropdownCols === 1,
                          'grid-cols-2': dropdownCols === 2,
                          'grid-cols-3': dropdownCols === 3,
                          'grid-cols-4': dropdownCols === 4,
                          'overflow-x-hidden': dropdownTruncate
                        }"
                      >
                        <section
                          v-for="section in sectionsOf(menu)"
                          :key="section.group"
                          class="min-w-0 pb-1"
                        >
                          <p
                            v-if="section.group"
                            class="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground truncate"
                          >
                            {{ t(section.group) }}
                          </p>
                          <router-link
                            v-for="item in section.items"
                            :key="item.to"
                            :to="item.to"
                            :title="dropdownTruncate ? t(item.labelKey) : undefined"
                            :class="[
                              'block min-w-0 px-4 py-1.5 text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors whitespace-nowrap',
                              dropdownTruncate ? 'truncate' : '',
                              isSubItemActive(menu, item.to) ? 'nav-sub-link--active' : ''
                            ]"
                            @click="closeMenu"
                          >
                            {{ t(item.labelKey) }}
                          </router-link>
                        </section>
                      </div>
                    </div>
                  </transition>
                </teleport>
              </div>
            </nav>

            <button
              type="button"
              :disabled="!canScrollRight"
              class="nav-scroll-btn nav-scroll-btn--right"
              @click="scrollNavBy(1)"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="orgUnitLabel" class="flex items-center gap-2 ml-4 shrink-0">
          <span class="text-sm font-medium text-primary whitespace-nowrap">{{ orgUnitLabel }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav-scroll {
  overflow: hidden;
}

.nav-scroll-area {
  scrollbar-width: none;
  padding-left: 36px;
  padding-right: 36px;
}

.nav-scroll-area::-webkit-scrollbar {
  display: none;
}

.nav-scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 32px;
  width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-foreground);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(6px);
  z-index: 60;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    background 0.15s ease;
}

.nav-scroll-btn:disabled {
  opacity: 0;
  pointer-events: none;
}

.nav-scroll-btn:hover {
  background: rgba(255, 255, 255, 1);
}

.nav-scroll-btn--left {
  left: 6px;
}

.nav-scroll-btn--right {
  right: 6px;
}

@media (min-width: 1024px) {
  .nav-scroll-btn {
    display: none;
  }

  .nav-scroll-area {
    padding-left: 0;
    padding-right: 0;
  }
}

.nav-top-link--active {
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 0 var(--color-primary);
}

.nav-sub-link--active {
  color: var(--color-primary);
  font-weight: 600;
}

.nav-sub-link--active:hover {
  color: white;
}

.dropdown-fade-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.dropdown-fade-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
