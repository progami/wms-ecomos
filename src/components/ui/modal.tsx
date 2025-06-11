import React from 'react'
import { Modal as AntModal } from 'antd'
import type { ModalProps as AntModalProps } from 'antd'

interface ModalProps extends AntModalProps {}

export function Modal({ className, ...props }: ModalProps) {
  return (
    <AntModal 
      className={className}
      {...props}
    />
  )
}

// Export static methods
export const confirm = AntModal.confirm
export const info = AntModal.info
export const success = AntModal.success
export const error = AntModal.error
export const warning = AntModal.warning