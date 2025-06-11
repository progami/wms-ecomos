import React from 'react'
import { Button as AntButton } from 'antd'
import type { ButtonProps as AntButtonProps } from 'antd'

interface ButtonProps extends Omit<AntButtonProps, 'type'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  buttonType?: 'button' | 'submit' | 'reset'
}

export function Button({ 
  variant = 'primary', 
  buttonType = 'button',
  className,
  children,
  ...props 
}: ButtonProps) {
  const typeMap = {
    primary: 'primary',
    secondary: 'default',
    danger: 'primary',
    ghost: 'default',
    link: 'link'
  } as const

  const classMap = {
    primary: '',
    secondary: '',
    danger: '',
    ghost: '',
    link: ''
  }

  return (
    <AntButton
      type={typeMap[variant]}
      danger={variant === 'danger'}
      ghost={variant === 'ghost'}
      htmlType={buttonType}
      className={`${classMap[variant]} ${className || ''}`}
      {...props}
    >
      {children}
    </AntButton>
  )
}