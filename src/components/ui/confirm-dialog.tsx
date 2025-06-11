'use client'

import React, { useEffect } from 'react'
import { Modal } from 'antd'
import { ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      const iconMap = {
        danger: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
        warning: <WarningOutlined style={{ color: '#f59e0b' }} />,
        info: <InfoCircleOutlined style={{ color: '#3b82f6' }} />
      }

      const modalRef = Modal.confirm({
        title,
        content: message,
        icon: iconMap[type],
        okText: confirmText,
        cancelText: cancelText,
        okType: type === 'danger' ? 'danger' : 'primary',
        onOk: () => {
          onConfirm()
          onClose()
        },
        onCancel: onClose,
        centered: true,
      })

      // Return cleanup function
      return () => {
        modalRef.destroy()
      }
    }
  }, [isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type])

  return null
}