export default function TestBasicPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600">Test Basic Page</h1>
      <p className="mt-4">If you can see this, Next.js routing is working!</p>
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Next Steps:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Check /admin/simple-dashboard for API testing</li>
          <li>Check /admin/test for client-side API testing</li>
          <li>Check /api/test-dashboard directly in browser</li>
        </ul>
      </div>
    </div>
  )
}