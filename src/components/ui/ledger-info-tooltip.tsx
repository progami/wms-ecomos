import { Info } from 'lucide-react'
import { Tooltip } from './tooltip'

export function LedgerInfoTooltip() {
  return (
    <Tooltip 
      content={
        <div className="space-y-1 text-xs">
          <p className="font-semibold">Immutable Ledger</p>
          <p>Transactions cannot be edited or deleted.</p>
          <p>Use ADJUST_IN/OUT for corrections.</p>
        </div>
      }
    >
      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
    </Tooltip>
  )
}