'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  endpoint: string
  fileName?: string
  buttonText?: string
  className?: string
}

export function ExportButton({ 
  endpoint, 
  fileName = 'export',
  buttonText = 'Export',
  className = '' 
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Error during export')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4 mr-2" />
      {loading ? 'Exporting...' : buttonText}
    </button>
  )
}