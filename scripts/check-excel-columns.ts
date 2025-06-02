import * as XLSX from 'xlsx'
import path from 'path'

const filePath = path.join(process.cwd(), 'data/Warehouse Management.xlsx')
const workbook = XLSX.readFile(filePath)

// Check cost master sheet columns
if (workbook.SheetNames.includes('cost master')) {
  console.log('=== COST MASTER SHEET ===')
  const sheet = workbook.Sheets['cost master']
  const data = XLSX.utils.sheet_to_json(sheet)
  
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0] as any))
    console.log('\nFirst 3 rows:')
    data.slice(0, 3).forEach((row: any, i: number) => {
      console.log(`Row ${i + 1}:`, row)
    })
  }
}