# Transaction Reference Patterns Analysis

## Executive Summary

This analysis examines 174 inventory transactions in the warehouse management system to identify patterns and extract meaningful information from reference fields and notes. The goal is to understand how transportation modes, tracking numbers, and other logistics data are currently stored and recommend improvements for data structure.

## Key Findings

### 1. Transportation Modes

**Current State:**
- 66 transactions (38%) have transportation mode data in the `modeOfTransportation` field
- Distribution:
  - LTL (Less Than Truckload): 51 transactions (77%)
  - SPD (Small Parcel Delivery): 11 transactions (17%)
  - FTL (Full Truckload): 4 transactions (6%)

**Patterns Found in References:**
- Transportation modes are often embedded in reference IDs (e.g., "UPS-LTL-MIX-SKU-43Boxes")
- Some references use variations like "SMALL PARCEL" instead of "SPD"

### 2. Reference ID Patterns

**Top Reference Formats:**
1. **Numeric-only references** (e.g., "72", "198", "216") - 69 occurrences
2. **FBA Shipment IDs** (e.g., "FBA15KDRK23D") - 18 occurrences
3. **Ocean carrier references**:
   - OOCL (Orient Overseas Container Line): 14 occurrences
   - MSC (Mediterranean Shipping Company): 9 occurrences
4. **Batch references** (e.g., "Batch 13 Received") - 12 occurrences
5. **Carrier-prefixed references** (e.g., "UPS-LTL-...") - 4 occurrences

### 3. Extracted Information

From analyzing reference fields and notes, we successfully extracted:

- **FBA Shipment IDs**: 18 transactions contain Amazon FBA shipment identifiers
- **Box/Carton Counts**: 133 transactions include quantity information
- **Carriers**: 4 transactions explicitly mention UPS as the carrier
- **Transport Modes**: 67 references contain transportation mode information
- **Batch Numbers**: 12 transactions reference batch numbers
- **Invoice Numbers**: 5 transactions contain invoice references

### 4. Ship Information

**Ship Names Found** (6 unique vessels):
- CDS Pakistan
- OOCL Spain
- MSC Ilaria
- OOCL Japan
- MSC Idania
- OOCL Germany

**Container Information:**
- No container numbers were found in the current data
- Ship names are stored in the dedicated `shipName` field

### 5. Missing Data

**Not Found:**
- Standard tracking numbers (UPS, FedEx, USPS format)
- Container numbers
- Date patterns in references
- Other carriers besides UPS

## Detailed Pattern Examples

### 1. Amazon FBA Shipments
```
Pattern: [Carrier]-[Mode]-[Details]-[FBAShipmentID]
Example: "UPS-LTL-MIX-SKU-43Boxes-FBA15KDRK23D"

Extracted:
- Carrier: UPS
- Mode: LTL
- Box Count: 43
- FBA ID: FBA15KDRK23D
```

### 2. Ocean Freight References
```
Pattern: [CarrierLine] [Additional Info]
Examples: 
- "OOCL Spain"
- "MSC Ilaria"
```

### 3. Batch Receiving
```
Pattern: Batch [Number] Received
Example: "Batch 13 Received"
```

## Recommendations

### 1. Database Schema Enhancements

Add the following fields to the `InventoryTransaction` table:

```prisma
model InventoryTransaction {
  // Existing fields...
  
  // New recommended fields
  carrier              String?         @map("carrier")
  trackingNumber       String?         @map("tracking_number")
  fbaShipmentId        String?         @map("fba_shipment_id")
  boxCount             Int?            @map("box_count")
  containerLine        String?         @map("container_line")
  invoiceReference     String?         @map("invoice_reference")
  
  // Enhanced enum field
  transportMode        TransportMode?  @map("transport_mode")
}

enum TransportMode {
  SPD    // Small Parcel Delivery
  LTL    // Less Than Truckload
  FTL    // Full Truckload
  AIR    // Air Freight
  OCEAN  // Ocean Freight
  RAIL   // Rail Transport
}

enum Carrier {
  UPS
  FEDEX
  DHL
  USPS
  XPO
  OTHER
}
```

### 2. Data Migration Strategy

1. **Parse existing references** to extract structured data:
   - Extract FBA shipment IDs from references
   - Parse box counts from references and notes
   - Identify carriers from reference prefixes
   - Standardize transportation modes

2. **Implement validation rules**:
   - FBA Shipment ID format: `FBA[0-9A-Z]{9,}`
   - Tracking number validation per carrier
   - Transport mode standardization

3. **Create data entry improvements**:
   - Dropdown for carriers
   - Dropdown for transport modes
   - Separate fields for tracking numbers and FBA IDs
   - Auto-parse reference fields for known patterns

### 3. Reference ID Standardization

Implement a standardized reference format:
```
[CARRIER]-[MODE]-[WAREHOUSE]-[DATE]-[SEQUENCE]
Example: UPS-LTL-LAX-20250530-001
```

### 4. Reporting Enhancements

With structured data, enable:
- Transportation mode analytics
- Carrier performance tracking
- FBA shipment tracking
- Container/vessel tracking for ocean freight
- Box count validation against actual inventory

## Implementation Priority

1. **High Priority**:
   - Add `transportMode` enum field
   - Add `fbaShipmentId` field
   - Add `boxCount` field
   - Migrate existing data

2. **Medium Priority**:
   - Add `carrier` field with enum
   - Add `trackingNumber` field
   - Implement reference parsing logic

3. **Low Priority**:
   - Add `containerLine` field
   - Add `invoiceReference` field
   - Implement automated pattern extraction

## Conclusion

The current system stores valuable logistics information in unstructured reference fields. By implementing the recommended schema changes and data migration, the system can:

1. Enable better reporting and analytics
2. Improve data validation and accuracy
3. Support integration with carrier APIs
4. Facilitate Amazon FBA reconciliation
5. Provide clearer visibility into transportation costs

The analysis identified clear patterns that can be leveraged to transform the existing unstructured data into a well-organized, queryable format.