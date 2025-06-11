import React from 'react'
import { Card, Alert, Typography, Space } from 'antd'
import { LucideIcon } from 'lucide-react'

const { Title, Text } = Typography

interface PageHeaderProps {
  title: string
  subtitle?: string
  description: string
  icon?: LucideIcon
  iconColor?: string
  bgColor?: string
  borderColor?: string
  textColor?: string
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
  textColor = 'text-blue-800',
  actions
}: PageHeaderProps) {
  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={2} className="!mb-2">{title}</Title>
          {subtitle && (
            <Text type="secondary">{subtitle}</Text>
          )}
        </div>
        {actions && (
          <Space>
            {actions}
          </Space>
        )}
      </div>
      
      <Alert
        message="About This Page:"
        description={description}
        type="info"
        showIcon={!!Icon}
        icon={Icon ? <Icon className={`h-5 w-5 ${iconColor}`} /> : undefined}
        className={`${bgColor} ${borderColor} ${textColor}`}
      />
    </Card>
  )
}

// Helpful tips component that can be added below forms or tables
interface HelpfulTipsProps {
  title?: string
  tips: string[]
  icon?: LucideIcon
  iconColor?: string
  bgColor?: string
  borderColor?: string
  textColor?: string
}

export function HelpfulTips({
  title = 'Helpful Tips:',
  tips,
  icon: Icon,
  iconColor = 'text-blue-600',
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
  textColor = 'text-blue-800'
}: HelpfulTipsProps) {
  return (
    <Alert
      message={title}
      description={
        <ul className="list-disc list-inside space-y-1 mt-2">
          {tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      }
      type="info"
      showIcon={!!Icon}
      icon={Icon ? <Icon className={`h-5 w-5 ${iconColor}`} /> : undefined}
      className={`${bgColor} ${borderColor} ${textColor}`}
    />
  )
}