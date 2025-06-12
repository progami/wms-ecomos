import { SchemaInspector } from '@/lib/schema-inspector';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

describe('SchemaInspector', () => {
  let inspector: SchemaInspector;

  beforeEach(() => {
    inspector = new SchemaInspector();
    jest.clearAllMocks();
  });

  describe('getTableColumns', () => {
    it('should return column information for a table', async () => {
      const mockColumns = [
        {
          column_name: 'id',
          data_type: 'uuid',
          is_nullable: 'NO',
          column_default: 'gen_random_uuid()',
        },
        {
          column_name: 'sku_code',
          data_type: 'character varying',
          is_nullable: 'NO',
          column_default: null,
        },
        {
          column_name: 'description',
          data_type: 'text',
          is_nullable: 'YES',
          column_default: null,
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
          column_default: 'CURRENT_TIMESTAMP',
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockColumns);

      const result = await inspector.getTableColumns('products');

      expect(prisma.$queryRaw).toHaveBeenCalledWith(
        expect.anything(),
        'products'
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        name: 'id',
        type: 'uuid',
        nullable: false,
        default: 'gen_random_uuid()',
      });
      expect(result[1]).toEqual({
        name: 'sku_code',
        type: 'character varying',
        nullable: false,
        default: null,
      });
      expect(result[2]).toEqual({
        name: 'description',
        type: 'text',
        nullable: true,
        default: null,
      });
    });

    it('should handle empty results', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await inspector.getTableColumns('non_existent_table');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(inspector.getTableColumns('products')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getTableRelationships', () => {
    it('should return foreign key relationships', async () => {
      const mockRelationships = [
        {
          constraint_name: 'inventory_product_id_fkey',
          table_name: 'inventory',
          column_name: 'product_id',
          foreign_table_name: 'products',
          foreign_column_name: 'id',
        },
        {
          constraint_name: 'inventory_warehouse_id_fkey',
          table_name: 'inventory',
          column_name: 'warehouse_id',
          foreign_table_name: 'warehouses',
          foreign_column_name: 'id',
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockRelationships);

      const result = await inspector.getTableRelationships('inventory');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        constraintName: 'inventory_product_id_fkey',
        columnName: 'product_id',
        referencedTable: 'products',
        referencedColumn: 'id',
      });
      expect(result[1]).toEqual({
        constraintName: 'inventory_warehouse_id_fkey',
        columnName: 'warehouse_id',
        referencedTable: 'warehouses',
        referencedColumn: 'id',
      });
    });
  });

  describe('getTableIndexes', () => {
    it('should return table indexes', async () => {
      const mockIndexes = [
        {
          indexname: 'products_pkey',
          indexdef: 'CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id)',
        },
        {
          indexname: 'idx_products_sku_code',
          indexdef: 'CREATE UNIQUE INDEX idx_products_sku_code ON public.products USING btree (sku_code)',
        },
        {
          indexname: 'idx_products_created_at',
          indexdef: 'CREATE INDEX idx_products_created_at ON public.products USING btree (created_at)',
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockIndexes);

      const result = await inspector.getTableIndexes('products');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'products_pkey',
        definition: mockIndexes[0].indexdef,
        isUnique: true,
        isPrimary: true,
      });
      expect(result[1]).toEqual({
        name: 'idx_products_sku_code',
        definition: mockIndexes[1].indexdef,
        isUnique: true,
        isPrimary: false,
      });
      expect(result[2]).toEqual({
        name: 'idx_products_created_at',
        definition: mockIndexes[2].indexdef,
        isUnique: false,
        isPrimary: false,
      });
    });
  });

  describe('getAllTables', () => {
    it('should return all table names in the schema', async () => {
      const mockTables = [
        { table_name: 'products' },
        { table_name: 'warehouses' },
        { table_name: 'inventory' },
        { table_name: 'transactions' },
        { table_name: 'users' },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockTables);

      const result = await inspector.getAllTables();

      expect(result).toEqual([
        'products',
        'warehouses',
        'inventory',
        'transactions',
        'users',
      ]);
    });

    it('should filter out system tables', async () => {
      const mockTables = [
        { table_name: 'products' },
        { table_name: '_prisma_migrations' },
        { table_name: 'pg_stat_statements' },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockTables);

      const result = await inspector.getAllTables();

      expect(result).toEqual(['products']);
    });
  });

  describe('getTableSchema', () => {
    it('should return complete schema information for a table', async () => {
      const mockColumns = [
        {
          column_name: 'id',
          data_type: 'uuid',
          is_nullable: 'NO',
          column_default: 'gen_random_uuid()',
        },
      ];

      const mockRelationships = [
        {
          constraint_name: 'inventory_product_id_fkey',
          table_name: 'inventory',
          column_name: 'product_id',
          foreign_table_name: 'products',
          foreign_column_name: 'id',
        },
      ];

      const mockIndexes = [
        {
          indexname: 'inventory_pkey',
          indexdef: 'CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (id)',
        },
      ];

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce(mockColumns)
        .mockResolvedValueOnce(mockRelationships)
        .mockResolvedValueOnce(mockIndexes);

      const result = await inspector.getTableSchema('inventory');

      expect(result).toEqual({
        tableName: 'inventory',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            nullable: false,
            default: 'gen_random_uuid()',
          },
        ],
        relationships: [
          {
            constraintName: 'inventory_product_id_fkey',
            columnName: 'product_id',
            referencedTable: 'products',
            referencedColumn: 'id',
          },
        ],
        indexes: [
          {
            name: 'inventory_pkey',
            definition: mockIndexes[0].indexdef,
            isUnique: true,
            isPrimary: true,
          },
        ],
      });
    });
  });

  describe('compareSchemas', () => {
    it('should identify schema differences', async () => {
      const schema1 = {
        tableName: 'products',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, default: null },
          { name: 'sku_code', type: 'varchar', nullable: false, default: null },
        ],
        relationships: [],
        indexes: [],
      };

      const schema2 = {
        tableName: 'products',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, default: null },
          { name: 'sku_code', type: 'varchar', nullable: false, default: null },
          { name: 'description', type: 'text', nullable: true, default: null },
        ],
        relationships: [],
        indexes: [],
      };

      const differences = inspector.compareSchemas(schema1, schema2);

      expect(differences).toEqual({
        addedColumns: [
          { name: 'description', type: 'text', nullable: true, default: null },
        ],
        removedColumns: [],
        modifiedColumns: [],
        addedRelationships: [],
        removedRelationships: [],
        addedIndexes: [],
        removedIndexes: [],
      });
    });

    it('should identify modified columns', async () => {
      const schema1 = {
        tableName: 'products',
        columns: [
          { name: 'price', type: 'integer', nullable: false, default: null },
        ],
        relationships: [],
        indexes: [],
      };

      const schema2 = {
        tableName: 'products',
        columns: [
          { name: 'price', type: 'decimal', nullable: true, default: '0' },
        ],
        relationships: [],
        indexes: [],
      };

      const differences = inspector.compareSchemas(schema1, schema2);

      expect(differences.modifiedColumns).toHaveLength(1);
      expect(differences.modifiedColumns[0]).toEqual({
        name: 'price',
        oldType: 'integer',
        newType: 'decimal',
        oldNullable: false,
        newNullable: true,
        oldDefault: null,
        newDefault: '0',
      });
    });
  });
});