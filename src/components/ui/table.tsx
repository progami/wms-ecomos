import React from 'react'
import { Table as AntTable } from 'antd'
import type { TableProps as AntTableProps } from 'antd'

interface TableProps<T = any> extends AntTableProps<T> {}

export function Table<T = any>({ className, ...props }: TableProps<T>) {
  return (
    <AntTable<T>
      className={className}
      {...props}
    />
  )
}

// Export Column for convenience
export const Column = AntTable.Column
export const ColumnGroup = AntTable.ColumnGroup