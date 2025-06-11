import React from 'react'
import { Select as AntSelect } from 'antd'
import type { SelectProps as AntSelectProps } from 'antd'

interface SelectProps extends AntSelectProps {}

export function Select({ className, ...props }: SelectProps) {
  return (
    <AntSelect 
      className={`w-full ${className || ''}`}
      {...props}
    />
  )
}

// Export Option for convenience
export const Option = AntSelect.Option