import React from 'react'
import { Empty, Button } from 'antd'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Empty
      image={<Icon className="h-12 w-12 text-gray-400 mx-auto" />}
      imageStyle={{ height: 60 }}
      description={
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
        </div>
      }
    >
      {action && (
        <Button type="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Empty>
  )
}