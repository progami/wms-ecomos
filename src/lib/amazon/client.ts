import SellingPartnerAPI from 'amazon-sp-api'

// Initialize the Amazon SP-API client
let spApiClient: any = null

export function getAmazonClient() {
  if (!spApiClient) {
    spApiClient = new SellingPartnerAPI({
      region: process.env.AMAZON_REGION || 'eu-west-1',
      refresh_token: process.env.AMAZON_REFRESH_TOKEN,
      options: {
        auto_request_tokens: true,
        auto_request_throttled: true
      }
    })
  }
  return spApiClient
}

// Helper functions for common operations
export async function getInventory() {
  try {
    const client = getAmazonClient()
    const response = await client.callAPI({
      operation: 'getFbaInventorySummaries',
      endpoint: 'fbaInventory',
      query: {
        marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
        details: true
      }
    })
    return response
  } catch (error) {
    console.error('Error fetching Amazon inventory:', error)
    throw error
  }
}

export async function getInboundShipments() {
  try {
    const client = getAmazonClient()
    const response = await client.callAPI({
      operation: 'getShipments',
      endpoint: 'fbaInbound',
      query: {
        marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
        shipmentStatusList: ['WORKING', 'SHIPPED', 'RECEIVING', 'CLOSED']
      }
    })
    return response
  } catch (error) {
    console.error('Error fetching inbound shipments:', error)
    throw error
  }
}

export async function getOrders(createdAfter?: Date) {
  try {
    const client = getAmazonClient()
    const response = await client.callAPI({
      operation: 'getOrders',
      endpoint: 'orders',
      query: {
        marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
        createdAfter: createdAfter || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default to last 7 days
      }
    })
    return response
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

export async function getCatalogItem(asin: string) {
  try {
    const client = getAmazonClient()
    const response = await client.callAPI({
      operation: 'getCatalogItem',
      endpoint: 'catalogItems',
      path: {
        asin
      },
      query: {
        marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID]
      }
    })
    return response
  } catch (error) {
    console.error('Error fetching catalog item:', error)
    throw error
  }
}

export async function getProductFees(asin: string, price: number) {
  try {
    const client = getAmazonClient()
    const response = await client.callAPI({
      operation: 'getMyFeesEstimateForASIN',
      endpoint: 'productFees',
      path: {
        asin
      },
      body: {
        FeesEstimateRequest: {
          MarketplaceId: process.env.AMAZON_MARKETPLACE_ID,
          PriceToEstimateFees: {
            ListingPrice: {
              CurrencyCode: 'GBP',
              Amount: price
            }
          },
          IsAmazonFulfilled: true
        }
      }
    })
    return response
  } catch (error) {
    console.error('Error fetching product fees:', error)
    throw error
  }
}