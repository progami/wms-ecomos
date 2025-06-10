import { redirect } from 'next/navigation'

export default function InvoiceEditPage({ params }: { params: { id: string } }) {
  // Invoice editing is done through the new invoice page with query params
  redirect(`/finance/invoices/new?edit=${params.id}`)
}