// The library ships without types: this describes the part of its API the app uses.
declare module 'vue3-org-chart' {
  import type { AllowedComponentProps, ComponentCustomProps, VNode, VNodeProps } from 'vue'

  /** Flat node list: the hierarchy comes from parentId, and a single node has no parent. */
  export interface OrgChartNode {
    id: string
    parentId: string | null
  }

  export interface OrgChartNodeSlotProps {
    item: OrgChartNode & Record<string, unknown>
    children: OrgChartNode[]
    open: boolean
    toggleChildren: () => void
  }

  /** `data` is read once, when the chart mounts: remount it to show new data. */
  export const Vue3OrgChart: new () => {
    $props: AllowedComponentProps &
      ComponentCustomProps &
      VNodeProps & {
        data: OrgChartNode[]
        minimap?: boolean
      }
    $slots: {
      node?: (props: OrgChartNodeSlotProps) => VNode[]
      'no-data'?: () => VNode[]
    }
  }
}
