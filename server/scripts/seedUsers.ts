import { seedUserData } from '../routes/testDataRoutes';
import { db } from '../db';

async function main() {
  const users = db.prepare('SELECT id, email, name FROM users').all() as any[];
  console.log(`Found ${users.length} users to seed.`);

  for (const user of users) {
    console.log(`Seeding visual library for user ${user.id} (${user.email})...`);
    const items = await seedUserData(user.id);
    console.log(`-> Successfully seeded ${items.length} visual screenshots for ${user.email}`);
  }

  const count = db.prepare('SELECT count(*) as total FROM screenshots').get() as any;
  console.log(`Total screenshots in database now: ${count.total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
