import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { getAmazonClient, getInventory, getInboundShipments, getOrders, getCatalogItem, getProductFees, getMonthlyStorageFees, getInventoryAgedData } from '@/lib/amazon/client'

// Mock the amazon-sp-api module
jest.mock('amazon-sp-api')

describe('Amazon SP-API Integration Tests', () => {
  let mockSpApiClient: any
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Setup mock client
    mockSpApiClient = {
      callAPI: jest.fn()
    }
    
    // Mock the module
    jest.mock('amazon-sp-api', () => ({
      default: jest.fn().mockImplementation(() => mockSpApiClient)
    }))
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Success Scenarios', () => {
    test('should successfully fetch inventory', async () => {
      const mockInventoryResponse = {
        inventorySummaries: [
          {
            asin: 'B001234567',
            fnSku: 'TEST-SKU-001',
            sellerSku: 'SELLER-001',
            totalQuantity: 150,
            condition: 'NewItem'
          }
        ],
        nextToken: null
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(mockInventoryResponse)
      
      const result = await getInventory()
      
      expect(mockSpApiClient.callAPI).toHaveBeenCalledWith({
        operation: 'getInventorySummaries',
        endpoint: 'fbaInventory',
        query: expect.objectContaining({
          marketplaceIds: expect.any(Array),
          granularityType: 'Marketplace'
        })
      })
      
      expect(result).toEqual(mockInventoryResponse)
    })
    
    test('should successfully fetch inbound shipments', async () => {
      const mockShipmentsResponse = {
        shipments: [
          {
            shipmentId: 'FBA15DJ8K123',
            shipmentName: 'Test Shipment',
            shipmentStatus: 'RECEIVING',
            labelPrepType: 'NO_LABEL',
            destinationFulfillmentCenterId: 'PHX7'
          }
        ]
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(mockShipmentsResponse)
      
      const result = await getInboundShipments()
      
      expect(mockSpApiClient.callAPI).toHaveBeenCalledWith({
        operation: 'getShipments',
        endpoint: 'fbaInbound',
        query: expect.objectContaining({
          shipmentStatusList: ['WORKING', 'SHIPPED', 'RECEIVING', 'CLOSED']
        })
      })
      
      expect(result).toEqual(mockShipmentsResponse)
    })
    
    test('should successfully fetch orders with date filter', async () => {
      const mockOrdersResponse = {
        orders: [
          {
            amazonOrderId: '123-4567890-1234567',
            purchaseDate: '2024-01-20T10:30:00Z',
            orderStatus: 'Shipped',
            fulfillmentChannel: 'AFN'
          }
        ]
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(mockOrdersResponse)
      
      const createdAfter = new Date('2024-01-15')
      const result = await getOrders(createdAfter)
      
      expect(mockSpApiClient.callAPI).toHaveBeenCalledWith({
        operation: 'getOrders',
        endpoint: 'orders',
        query: expect.objectContaining({
          createdAfter: createdAfter
        })
      })
      
      expect(result).toEqual(mockOrdersResponse)
    })
  })

  describe('Failure Scenarios', () => {
    test('should handle rate limiting (429 error)', async () => {
      const rateLimitError = {
        statusCode: 429,
        headers: {
          'x-amzn-RateLimit-Limit': '10',
          'x-amzn-RequestId': 'test-request-id'
        },
        body: {
          errors: [{
            code: 'QuotaExceeded',
            message: 'Request rate exceeded'
          }]
        }
      }
      
      mockSpApiClient.callAPI.mockRejectedValueOnce(rateLimitError)
      
      await expect(getInventory()).rejects.toEqual(rateLimitError)
      
      // Verify the API was called
      expect(mockSpApiClient.callAPI).toHaveBeenCalledTimes(1)
    })
    
    test('should handle authentication errors', async () => {
      const authError = {
        statusCode: 403,
        body: {
          errors: [{
            code: 'Unauthorized',
            message: 'The request signature does not conform to AWS standards'
          }]
        }
      }
      
      mockSpApiClient.callAPI.mockRejectedValueOnce(authError)
      
      await expect(getCatalogItem('B001234567')).rejects.toEqual(authError)
    })
    
    test('should handle network timeouts', async () => {
      const timeoutError = new Error('ETIMEDOUT')
      mockSpApiClient.callAPI.mockRejectedValueOnce(timeoutError)
      
      await expect(getOrders()).rejects.toThrow('ETIMEDOUT')
    })
    
    test('should handle invalid response data', async () => {
      // Return null/undefined response
      mockSpApiClient.callAPI.mockResolvedValueOnce(null)
      
      const result = await getInventory()
      expect(result).toBeNull()
      
      // Return malformed response
      mockSpApiClient.callAPI.mockResolvedValueOnce({ unexpectedField: 'value' })
      
      const result2 = await getInboundShipments()
      expect(result2).toEqual({ unexpectedField: 'value' })
    })
  })

  describe('Retry Logic', () => {
    test('should use auto_request_throttled option for automatic retries', async () => {
      const SellingPartnerAPI = require('amazon-sp-api')
      
      // Verify client is initialized with retry options
      const client = getAmazonClient()
      
      expect(SellingPartnerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            auto_request_tokens: true,
            auto_request_throttled: true
          })
        })
      )
    })
  })

  describe('Rate Limiting', () => {
    test('should respect rate limits across multiple calls', async () => {
      const mockResponses = Array(5).fill({
        inventorySummaries: []
      })
      
      mockSpApiClient.callAPI.mockResolvedValue(...mockResponses)
      
      // Make multiple concurrent calls
      const promises = Array(5).fill(null).map(() => getInventory())
      
      const results = await Promise.all(promises)
      
      // All calls should succeed
      expect(results).toHaveLength(5)
      expect(mockSpApiClient.callAPI).toHaveBeenCalledTimes(5)
    })
  })

  describe('Data Transformation', () => {
    test('should correctly transform inventory data', async () => {
      const mockInventoryResponse = {
        inventorySummaries: [
          {
            asin: 'B001234567',
            fnSku: 'TEST-SKU-001',
            totalQuantity: 150,
            condition: 'NewItem',
            lastUpdatedTime: '2024-01-20T10:30:00Z'
          }
        ]
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(mockInventoryResponse)
      
      const result = await getInventory()
      
      // Verify data structure is preserved
      expect(result.inventorySummaries[0]).toMatchObject({
        asin: 'B001234567',
        fnSku: 'TEST-SKU-001',
        totalQuantity: 150,
        condition: 'NewItem'
      })
    })
    
    test('should handle storage fee filtering', async () => {
      const mockFinancialEvents = {
        FinancialEvents: {
          ServiceFeeEventList: [
            {
              FeeDescription: 'FBA Monthly Storage Fee',
              FeeAmount: { Amount: -25.50, CurrencyCode: 'GBP' }
            },
            {
              FeeDescription: 'FBA Long-term Storage Fee', 
              FeeAmount: { Amount: -100.00, CurrencyCode: 'GBP' }
            },
            {
              FeeDescription: 'Other Fee',
              FeeAmount: { Amount: -10.00, CurrencyCode: 'GBP' }
            }
          ]
        }
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(mockFinancialEvents)
      
      const result = await getMonthlyStorageFees()
      
      // Should only return storage-related fees
      expect(result).toHaveLength(2)
      expect(result.every((fee: any) => 
        fee.FeeDescription.toLowerCase().includes('storage')
      )).toBe(true)
    })
  })

  describe('Error Recovery', () => {
    test('should handle partial API failures gracefully', async () => {
      // First call fails
      mockSpApiClient.callAPI.mockRejectedValueOnce(new Error('API Error'))
      
      // Second call succeeds
      const successResponse = { inventorySummaries: [] }
      mockSpApiClient.callAPI.mockResolvedValueOnce(successResponse)
      
      // First call should fail
      await expect(getInventory()).rejects.toThrow('API Error')
      
      // Second call should succeed
      const result = await getInventory()
      expect(result).toEqual(successResponse)
    })
    
    test('should handle API response with missing optional fields', async () => {
      const incompleteResponse = {
        orders: [{
          amazonOrderId: '123-4567890-1234567',
          // Missing optional fields
        }]
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(incompleteResponse)
      
      const result = await getOrders()
      
      // Should not throw error for missing optional fields
      expect(result).toEqual(incompleteResponse)
    })
  })

  describe('Environment Configuration', () => {
    test('should use mock client when credentials are missing', async () => {
      // Temporarily remove env vars
      const originalClientId = process.env.AMAZON_SP_APP_CLIENT_ID
      const originalClientSecret = process.env.AMAZON_SP_APP_CLIENT_SECRET
      
      delete process.env.AMAZON_SP_APP_CLIENT_ID
      delete process.env.AMAZON_SP_APP_CLIENT_SECRET
      
      // Clear module cache to force re-evaluation
      jest.resetModules()
      
      const { getAmazonClient: getClient } = require('@/lib/amazon/client')
      const mockClient = require('@/lib/amazon/mock-client')
      
      jest.spyOn(mockClient, 'getAmazonClient')
      
      const client = getClient()
      
      expect(mockClient.getAmazonClient).toHaveBeenCalled()
      
      // Restore env vars
      process.env.AMAZON_SP_APP_CLIENT_ID = originalClientId
      process.env.AMAZON_SP_APP_CLIENT_SECRET = originalClientSecret
    })
  })

  describe('Product Fee Calculations', () => {
    test('should fetch product fees with correct parameters', async () => {
      const mockFeesResponse = {
        FeesEstimateResult: {
          FeesEstimateIdentifier: {
            MarketplaceId: 'A1F83G8C2ARO7P',
            IdType: 'ASIN',
            IdValue: 'B001234567'
          },
          FeesEstimate: {
            TotalFeesEstimate: {
              Amount: 3.50,
              CurrencyCode: 'GBP'
            }
          }
        }
      }
      
      mockSpApiClient.callAPI.mockResolvedValueOnce(mockFeesResponse)
      
      const result = await getProductFees('B001234567', 10.99)
      
      expect(mockSpApiClient.callAPI).toHaveBeenCalledWith({
        operation: 'getMyFeesEstimateForASIN',
        endpoint: 'productFees',
        path: { asin: 'B001234567' },
        body: {
          FeesEstimateRequest: {
            MarketplaceId: process.env.AMAZON_MARKETPLACE_ID,
            PriceToEstimateFees: {
              ListingPrice: {
                CurrencyCode: 'GBP',
                Amount: 10.99
              }
            },
            IsAmazonFulfilled: true
          }
        }
      })
      
      expect(result).toEqual(mockFeesResponse)
    })
  })
})