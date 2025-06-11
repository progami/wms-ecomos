import React from 'react'
import { Input as AntInput } from 'antd'
import type { InputProps as AntInputProps } from 'antd'

interface InputProps extends AntInputProps {}

export function Input({ className, ...props }: InputProps) {
  return (
    <AntInput 
      className={className}
      {...props}
    />
  )
}

// Export additional input types for convenience
export const TextArea = AntInput.TextArea
export const Search = AntInput.Search
export const Password = AntInput.Password