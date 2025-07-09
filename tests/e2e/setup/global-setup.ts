import { execSync } from 'child_process';
import path from 'path';

async function globalSetup() {
  console.log('🔧 Running E2E test setup...');
  
  try {
    // Change to project root directory
    const projectRoot = path.resolve(__dirname, '../../..');
    process.chdir(projectRoot);
    
    // Run database migrations
    console.log('📊 Running database migrations...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    
    // Seed the database
    console.log('🌱 Seeding database with test data...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
    
    console.log('✅ E2E test setup complete!');
  } catch (error) {
    console.error('❌ Error during E2E test setup:', error);
    throw error;
  }
}

export default globalSetup;