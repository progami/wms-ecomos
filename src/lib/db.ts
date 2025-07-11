import { Pool } from 'pg'

// Create a connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
})

// Test the connection
pool.on('error', (err) => {
  // console.error('Unexpected error on idle client', err)
})

// Helper function to get a client from the pool
export async function getClient() {
  try {
    const client = await pool.connect()
    return client
  } catch (error) {
    // console.error('Error connecting to database:', error)
    throw error
  }
}

// Helper function to run a query
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params)
    return result
  } catch (error) {
    // console.error('Database query error:', error)
    throw error
  }
}