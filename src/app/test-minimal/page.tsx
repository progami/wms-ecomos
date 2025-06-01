export default function TestMinimalPage() {
  return (
    <html>
      <body>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ color: 'blue' }}>Minimal Test Page</h1>
          <p>This page has no dependencies - just plain HTML.</p>
          <hr />
          <h2>API Test Links:</h2>
          <ul>
            <li><a href="/api/test-dashboard">/api/test-dashboard</a> - Should return JSON</li>
            <li><a href="/api/admin/dashboard-simple">/api/admin/dashboard-simple</a> - Simple dashboard API</li>
          </ul>
          <hr />
          <h2>Page Test Links:</h2>
          <ul>
            <li><a href="/test-basic">/test-basic</a> - Basic Next.js page</li>
            <li><a href="/admin/simple-dashboard">/admin/simple-dashboard</a> - Dashboard with API calls</li>
            <li><a href="/admin/test">/admin/test</a> - Test admin page</li>
          </ul>
        </div>
      </body>
    </html>
  )
}