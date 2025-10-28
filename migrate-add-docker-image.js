import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to the database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'instances.db');
console.log(`Connecting to database: ${dbPath}`);

const db = new Database(dbPath);

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(instances)").all();
  const hasDockerImageColumn = tableInfo.some(col => col.name === 'docker_image');

  if (hasDockerImageColumn) {
    console.log('✅ Column "docker_image" already exists. No migration needed.');
  } else {
    console.log('Adding "docker_image" column to instances table...');
    db.exec('ALTER TABLE instances ADD COLUMN docker_image TEXT;');
    console.log('✅ Successfully added "docker_image" column!');
  }

  // Verify the column was added
  const updatedTableInfo = db.prepare("PRAGMA table_info(instances)").all();
  console.log('\nCurrent table structure:');
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n✅ Migration complete!');
