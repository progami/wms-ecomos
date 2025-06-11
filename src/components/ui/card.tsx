import React from 'react'
import { Card as AntCard } from 'antd'
import type { CardProps as AntCardProps } from 'antd'

interface CardProps extends AntCardProps {}

export function Card({ className, ...props }: CardProps) {
  return (
    <AntCard 
      className={className}
      {...props}
    />
  )
}

// Export Meta for convenience
export const CardMeta = AntCard.Meta