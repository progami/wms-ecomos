import React from 'react'
import { Tag } from 'antd'
import type { TagProps } from 'antd'

interface BadgeProps extends Omit<TagProps, 'color'> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default'
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({ 
  variant = 'default', 
  size = 'md',
  className,
  children,
  ...props 
}: BadgeProps) {
  const colorMap = {
    primary: 'blue',
    success: 'green',
    warning: 'gold',
    error: 'red',
    info: 'cyan',
    default: 'default'
  } as const

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  }

  return (
    <Tag
      color={colorMap[variant]}
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

// For backwards compatibility with existing badge classes
export function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  const variantMap: Record<string, BadgeProps['variant']> = {
    active: 'success',
    inactive: 'error',
    pending: 'warning',
    completed: 'success',
    failed: 'error',
    processing: 'info',
    draft: 'default'
  }

  return (
    <Badge variant={variantMap[status.toLowerCase()] || 'default'}>
      {children}
    </Badge>
  )
}