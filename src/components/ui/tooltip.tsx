'use client'

import React from 'react'
import { Tooltip as AntTooltip } from 'antd'
import { QuestionCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'

interface TooltipProps {
  content: string
  children?: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  icon?: 'help' | 'info'
  iconSize?: 'sm' | 'md' | 'lg'
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  icon = 'help',
  iconSize = 'sm'
}: TooltipProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const Icon = icon === 'help' ? QuestionCircleOutlined : InfoCircleOutlined

  return (
    <AntTooltip title={content} placement={position}>
      {children || (
        <Icon className={`${sizeClasses[iconSize]} text-gray-400 hover:text-gray-600 cursor-help`} />
      )}
    </AntTooltip>
  )
}

// Quick helper for inline tooltips
interface InlineTooltipProps {
  label: string
  tooltip: string
  required?: boolean
}

export function InlineTooltip({ label, tooltip, required }: InlineTooltipProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <Tooltip content={tooltip} iconSize="sm" />
    </div>
  )
}