'use client'

import { Construction, Package, TrendingUp, Truck, Mail, Calendar } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'

export default function ShipmentPlanningPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="FBA Shipment Planning"
          subtitle="Automated shipment planning based on FBA stock levels"
          description="Future feature: This will automatically monitor FBA stock levels, suggest replenishment quantities, and help create shipments with integrated carrier selection and email notifications."
          icon={TrendingUp}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          textColor="text-purple-800"
        />

        {/* Under Construction Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8">
          <div className="flex flex-col items-center text-center">
            <Construction className="h-16 w-16 text-yellow-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Feature Under Construction
            </h2>
            <p className="text-gray-600 max-w-2xl mb-6">
              This automated shipment planning feature is currently in development. 
              Once completed, it will streamline your FBA replenishment workflow.
            </p>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Current Manual Process:</p>
              <p className="text-sm text-gray-700">
                Please continue using the manual process: Monitor FBA stock → Create shipment plan → 
                Compare carrier rates → Book appointment → Email warehouse
              </p>
            </div>
          </div>
        </div>

        {/* Planned Features */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Package}
            title="FBA Stock Monitoring"
            description="Real-time monitoring of FBA inventory levels with automatic low-stock alerts"
            status="Planned"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Smart Replenishment"
            description="AI-powered suggestions for replenishment quantities based on sales velocity"
            status="Planned"
          />
          <FeatureCard
            icon={Truck}
            title="Carrier Integration"
            description="Compare rates from Amazon Freight and partnered carriers automatically"
            status="Planned"
          />
          <FeatureCard
            icon={Calendar}
            title="Appointment Booking"
            description="Integrated appointment scheduling with preferred carriers"
            status="Future"
          />
          <FeatureCard
            icon={Mail}
            title="Automated Emails"
            description="Generate and send shipment emails to warehouse with tracking references"
            status="Planned"
          />
          <FeatureCard
            icon={Package}
            title="Confirmation Tracking"
            description="Track warehouse confirmations and shipment status updates"
            status="Planned"
          />
        </div>

        {/* Workflow Preview */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Planned Workflow</h3>
          <div className="space-y-4">
            <WorkflowStep
              number="1"
              title="Monitor FBA Stock"
              description="System continuously monitors FBA inventory levels"
            />
            <WorkflowStep
              number="2"
              title="Generate Suggestions"
              description="Automatically suggest replenishment when stock is low"
            />
            <WorkflowStep
              number="3"
              title="Create Shipment"
              description="Pre-populate ship goods form with suggested quantities"
            />
            <WorkflowStep
              number="4"
              title="Compare Carriers"
              description="Show rates from different carriers for selection"
            />
            <WorkflowStep
              number="5"
              title="Send to Warehouse"
              description="Generate email with shipment details and references"
            />
            <WorkflowStep
              number="6"
              title="Track Confirmation"
              description="Monitor warehouse confirmation and update status"
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Benefits When Launched
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Reduce manual monitoring time by 80%</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Prevent stockouts with proactive replenishment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Standardize email communication with warehouses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Maintain consistent reference numbers across systems</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Track shipment confirmations automatically</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
  status: 'Planned' | 'In Development' | 'Future'
}

function FeatureCard({ icon: Icon, title, description, status }: FeatureCardProps) {
  const statusColors = {
    'Planned': 'bg-blue-100 text-blue-800',
    'In Development': 'bg-green-100 text-green-800',
    'Future': 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <Icon className="h-8 w-8 text-gray-600" />
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[status]}`}>
          {status}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

interface WorkflowStepProps {
  number: string
  title: string
  description: string
}

function WorkflowStep({ number, title, description }: WorkflowStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}