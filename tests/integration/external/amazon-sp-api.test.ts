import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock the amazon-sp-api module
const mockCallAPI = jest.fn()
jest.mock('amazon-sp-api', () => ({
  default: jest.fn(() => ({
    callAPI: mockCallAPI
  }))
}))

// Import after mocking
import { getAmazonClient, getInventory, getInboundShipments, getOrders, getCatalogItem, getProductFees, getMonthlyStorageFees, getInventoryAgedData } from '@/lib/amazon/client'

describe('Amazon SP-API Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
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
      
      mockCallAPI.mockResolvedValueOnce(mockInventoryResponse)
      
      const result = await getInventory()
      
      expect(mockCallAPI).toHaveBeenCalledWith({
        operation: 'getInventorySummaries',
        endpoint: 'fbaInventory',
        query: {
          details: true,
          marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID]
        }
      })
      
      expect(result).toEqual(mockInventoryResponse.inventorySummaries)
    })
    
    test('should handle paginated inventory results', async () => {
      const mockPage1 = {
        inventorySummaries: [
          { asin: 'B001', fnSku: 'SKU-001', totalQuantity: 100 }
        ],
        nextToken: 'token123'
      }
      
      const mockPage2 = {
        inventorySummaries: [
          { asin: 'B002', fnSku: 'SKU-002', totalQuantity: 200 }
        ],
        nextToken: null
      }
      
      mockCallAPI
        .mockResolvedValueOnce(mockPage1)
        .mockResolvedValueOnce(mockPage2)
      
      const result = await getInventory()
      
      expect(mockCallAPI).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
      expect(result[0].fnSku).toBe('SKU-001')
      expect(result[1].fnSku).toBe('SKU-002')
    })
    
    test('should successfully fetch inbound shipments', async () => {
      const mockShipmentsResponse = {
        shipments: [
          {
            shipmentId: 'FBA123456',
            shipmentName: 'Test Shipment',
            shipmentStatus: 'WORKING',
            destinationFulfillmentCenterId: 'PHX3',
            labelPrepType: 'SELLER_LABEL',
            items: [
              {
                sellerSku: 'SKU-001',
                quantityShipped: 100,
                quantityReceived: 95
              }
            ]
          }
        ]
      }
      
      mockCallAPI.mockResolvedValueOnce(mockShipmentsResponse)
      
      const result = await getInboundShipments('WORKING')
      
      expect(mockCallAPI).toHaveBeenCalledWith({
        operation: 'getShipments',
        endpoint: 'fbaInbound',
        query: {
          marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
          shipmentStatusList: ['WORKING']
        }
      })
      
      expect(result).toEqual(mockShipmentsResponse.shipments)
    })
    
    test('should successfully fetch orders', async () => {
      const mockOrdersResponse = {
        orders: [
          {
            amazonOrderId: '111-1234567-1234567',
            purchaseDate: '2024-01-15T10:30:00Z',
            orderStatus: 'Shipped',
            fulfillmentChannel: 'AFN',
            orderTotal: {
              currencyCode: 'USD',
              amount: '99.99'
            },
            numberOfItemsShipped: 1,
            numberOfItemsUnshipped: 0
          }
        ],
        nextToken: null
      }
      
      mockCallAPI.mockResolvedValueOnce(mockOrdersResponse)
      
      const result = await getOrders({
        createdAfter: '2024-01-01',
        orderStatuses: ['Shipped']
      })
      
      expect(mockCallAPI).toHaveBeenCalledWith({
        operation: 'getOrders',
        endpoint: 'orders',
        query: {
          marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
          createdAfter: '2024-01-01',
          orderStatuses: ['Shipped']
        }
      })
      
      expect(result).toEqual(mockOrdersResponse.orders)
    })
    
    test('should successfully fetch catalog item details', async () => {
      const mockCatalogResponse = {
        asin: 'B001234567',
        productTitle: 'Test Product',
        brandName: 'Test Brand',
        productDescription: 'This is a test product',
        productCategory: 'Electronics',
        images: [
          {
            link: 'https://example.com/image1.jpg',
            height: 500,
            width: 500
          }
        ],
        attributes: {
          item_dimensions: {
            height: { value: 10, unit: 'inches' },
            width: { value: 5, unit: 'inches' },
            length: { value: 3, unit: 'inches' }
          },
          item_weight: { value: 1.5, unit: 'pounds' }
        }
      }
      
      mockCallAPI.mockResolvedValueOnce(mockCatalogResponse)
      
      const result = await getCatalogItem('B001234567')
      
      expect(mockCallAPI).toHaveBeenCalledWith({
        operation: 'getCatalogItem',
        endpoint: 'catalogItems',
        path: {
          asin: 'B001234567'
        },
        query: {
          marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID]
        }
      })
      
      expect(result).toEqual(mockCatalogResponse)
    })
    
    test('should successfully calculate product fees', async () => {
      const mockFeesResponse = {
        feesEstimateResult: {
          status: 'Success',
          feesEstimate: {
            totalFeesEstimate: {
              currencyCode: 'USD',
              amount: 15.45
            },
            feeDetailList: [
              {
                feeType: 'ReferralFee',
                feeAmount: {
                  currencyCode: 'USD',
                  amount: 10.00
                }
              },
              {
                feeType: 'FulfillmentFee',
                feeAmount: {
                  currencyCode: 'USD',
                  amount: 5.45
                }
              }
            ]
          }
        }
      }
      
      mockCallAPI.mockResolvedValueOnce(mockFeesResponse)
      
      const result = await getProductFees({
        asin: 'B001234567',
        price: 99.99
      })
      
      expect(mockCallAPI).toHaveBeenCalledWith({
        operation: 'getMyFeesEstimateForASIN',
        endpoint: 'productFees',
        path: {
          asin: 'B001234567'
        },
        body: {
          feesEstimateRequest: {
            marketplaceId: process.env.AMAZON_MARKETPLACE_ID,
            priceToEstimateFees: {
              listingPrice: {
                currencyCode: 'USD',
                amount: 99.99
              }
            }
          }
        }
      })
      
      expect(result).toEqual(mockFeesResponse.feesEstimateResult)
    })
  })
  
  describe('Error Handling', () => {
    test('should handle API rate limiting (429)', async () => {
      const rateLimitError = {
        code: 'RequestThrottled',
        message: 'Request is throttled',
        details: 'You exceeded your quota',
        statusCode: 429
      }
      
      mockCallAPI.mockRejectedValueOnce(rateLimitError)
      
      await expect(getInventory()).rejects.toThrow('RequestThrottled')
      
      expect(mockCallAPI).toHaveBeenCalledTimes(1)
    })
    
    test('should handle API authentication errors (403)', async () => {
      const authError = {
        code: 'Forbidden',
        message: 'Access denied',
        statusCode: 403
      }
      
      mockCallAPI.mockRejectedValueOnce(authError)
      
      await expect(getOrders({})).rejects.toThrow('Forbidden')
    })
    
    test('should handle invalid ASIN errors', async () => {
      const invalidAsinError = {
        code: 'InvalidInput',
        message: 'Invalid ASIN provided',
        statusCode: 400
      }
      
      mockCallAPI.mockRejectedValueOnce(invalidAsinError)
      
      await expect(getCatalogItem('INVALID')).rejects.toThrow('InvalidInput')
    })
    
    test('should handle network timeouts', async () => {
      const timeoutError = new Error('ETIMEDOUT')
      
      mockCallAPI.mockRejectedValueOnce(timeoutError)
      
      await expect(getInventory()).rejects.toThrow('ETIMEDOUT')
    })
    
    test('should handle service unavailable errors (503)', async () => {
      const serviceError = {
        code: 'ServiceUnavailable',
        message: 'Service is temporarily unavailable',
        statusCode: 503
      }
      
      mockCallAPI.mockRejectedValueOnce(serviceError)
      
      await expect(getInboundShipments()).rejects.toThrow('ServiceUnavailable')
    })
  })
  
  describe('Data Transformation', () => {
    test('should transform inventory data correctly', async () => {
      const mockResponse = {
        inventorySummaries: [
          {
            asin: 'B001234567',
            fnSku: 'TEST-SKU-001',
            sellerSku: 'SELLER-001',
            totalQuantity: 150,
            condition: 'NewItem',
            fulfillableQuantity: 145,
            inboundWorkingQuantity: 50,
            inboundShippedQuantity: 25,
            inboundReceivingQuantity: 10,
            reservedQuantity: {
              totalReservedQuantity: 5,
              pendingCustomerOrderQuantity: 3,
              pendingTransshipmentQuantity: 2
            }
          }
        ]
      }
      
      mockCallAPI.mockResolvedValueOnce(mockResponse)
      
      const result = await getInventory()
      
      const item = result[0]
      expect(item).toMatchObject({
        asin: 'B001234567',
        fnSku: 'TEST-SKU-001',
        totalQuantity: 150,
        fulfillableQuantity: 145,
        reservedQuantity: expect.objectContaining({
          totalReservedQuantity: 5
        })
      })
    })
    
    test('should handle monthly storage fees data', async () => {
      const mockStorageFeesResponse = {
        monthlyStorageFees: [
          {
            asin: 'B001234567',
            fnSku: 'TEST-SKU-001',
            monthOfCharge: '2024-01',
            storageRate: 0.75,
            currencyCode: 'USD',
            estimatedMonthlyStorageFee: 15.50,
            averageQuantityOnHand: 100,
            itemVolume: {
              value: 0.25,
              unit: 'cubic feet'
            }
          }
        ]
      }
      
      mockCallAPI.mockResolvedValueOnce(mockStorageFeesResponse)
      
      const result = await getMonthlyStorageFees('2024-01')
      
      expect(mockCallAPI).toHaveBeenCalledWith({
        operation: 'getInventoryEstimatedMonthlyStorageFees',
        endpoint: 'fbaInventory',
        query: {
          marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
          monthOfCharge: '2024-01'
        }
      })
      
      expect(result).toEqual(mockStorageFeesResponse.monthlyStorageFees)
    })
    
    test('should handle inventory aged data', async () => {
      const mockAgedDataResponse = {
        inventoryDetails: [
          {
            asin: 'B001234567',
            fnSku: 'TEST-SKU-001',
            ageRanges: [
              {
                ageRange: '0-90',
                quantity: 50
              },
              {
                ageRange: '91-180',
                quantity: 30
              },
              {
                ageRange: '181-270',
                quantity: 20
              }
            ],
            totalQuantity: 100
          }
        ]
      }
      
      mockCallAPI.mockResolvedValueOnce(mockAgedDataResponse)
      
      const result = await getInventoryAgedData()
      
      expect(result).toEqual(mockAgedDataResponse.inventoryDetails)
      expect(result[0].ageRanges).toHaveLength(3)
      expect(result[0].totalQuantity).toBe(100)
    })
  })
  
  describe('Edge Cases', () => {
    test('should handle empty inventory response', async () => {
      mockCallAPI.mockResolvedValueOnce({
        inventorySummaries: [],
        nextToken: null
      })
      
      const result = await getInventory()
      
      expect(result).toEqual([])
    })
    
    test('should handle missing optional fields', async () => {
      const mockResponse = {
        inventorySummaries: [
          {
            asin: 'B001234567',
            fnSku: 'TEST-SKU-001',
            totalQuantity: 100
            // Missing optional fields like sellerSku, condition, etc.
          }
        ]
      }
      
      mockCallAPI.mockResolvedValueOnce(mockResponse)
      
      const result = await getInventory()
      
      expect(result[0]).toHaveProperty('asin', 'B001234567')
      expect(result[0]).toHaveProperty('totalQuantity', 100)
    })
    
    test('should handle special characters in responses', async () => {
      const mockResponse = {
        orders: [
          {
            amazonOrderId: '111-1234567-1234567',
            buyerName: 'José García',
            shippingAddress: {
              addressLine1: '123 Café Street',
              city: 'São Paulo'
            }
          }
        ]
      }
      
      mockCallAPI.mockResolvedValueOnce(mockResponse)
      
      const result = await getOrders({})
      
      expect(result[0].buyerName).toBe('José García')
      expect(result[0].shippingAddress.city).toBe('São Paulo')
    })
  })
  
  describe('Configuration', () => {
    test('should use environment variables correctly', async () => {
      const originalMarketplaceId = process.env.AMAZON_MARKETPLACE_ID
      process.env.AMAZON_MARKETPLACE_ID = 'ATVPDKIKX0DER' // US marketplace
      
      mockCallAPI.mockResolvedValueOnce({ inventorySummaries: [] })
      
      await getInventory()
      
      expect(mockCallAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            marketplaceIds: ['ATVPDKIKX0DER']
          })
        })
      )
      
      // Restore original value
      process.env.AMAZON_MARKETPLACE_ID = originalMarketplaceId
    })
    
    test('should handle missing environment variables gracefully', async () => {
      const originalMarketplaceId = process.env.AMAZON_MARKETPLACE_ID
      delete process.env.AMAZON_MARKETPLACE_ID
      
      mockCallAPI.mockResolvedValueOnce({ inventorySummaries: [] })
      
      await expect(getInventory()).rejects.toThrow()
      
      // Restore original value
      process.env.AMAZON_MARKETPLACE_ID = originalMarketplaceId
    })
  })
})