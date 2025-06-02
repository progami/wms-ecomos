async function testSkuApi() {
  console.log('🔍 Testing SKU API endpoints...')

  try {
    // Test getting all SKUs
    console.log('\n1. Testing GET /api/skus')
    const skusResponse = await fetch('http://localhost:3001/api/skus')
    if (!skusResponse.ok) {
      throw new Error(`Failed to get SKUs: ${skusResponse.status}`)
    }
    const skus = await skusResponse.json()
    console.log(`✅ Retrieved ${skus.length} SKUs`)

    if (skus.length > 0) {
      const firstSku = skus[0]
      console.log(`   First SKU: ${firstSku.skuCode} - ${firstSku.description}`)

      // Test getting single SKU
      console.log(`\n2. Testing GET /api/skus/${firstSku.id}`)
      const singleSkuResponse = await fetch(`http://localhost:3001/api/skus/${firstSku.id}`)
      if (!singleSkuResponse.ok) {
        throw new Error(`Failed to get single SKU: ${singleSkuResponse.status}`)
      }
      const singleSku = await singleSkuResponse.json()
      console.log(`✅ Retrieved SKU: ${singleSku.skuCode}`)
      console.log(`   ID: ${singleSku.id}`)
      console.log(`   Description: ${singleSku.description}`)
      console.log(`   Units per carton: ${singleSku.unitsPerCarton}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSkuApi().catch(console.error)