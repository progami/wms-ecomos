import React from 'react'
import { Tabs as AntTabs } from 'antd'
import type { TabsProps as AntTabsProps } from 'antd'

interface TabsProps extends AntTabsProps {}

export function Tabs({ className, ...props }: TabsProps) {
  return (
    <AntTabs 
      className={className}
      {...props}
    />
  )
}

// Export TabPane for convenience
export const TabPane = AntTabs.TabPane