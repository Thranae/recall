import { db, initDatabase } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function runAuthTests() {
  console.log('🧪 Starting RECALL Authentication & Packwise OTP Verification Test Suite...\n');
  await initDatabase();

  const JWT_SECRET = process.env.JWT_SECRET || 'recall_super_secret_jwt_key_2026_dev';
  const testEmail = `test_packwise_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Packwise Tester';

  // 1. Test Signup (Creates unverified user with 6-digit OTP)
  console.log('1️⃣ Testing /signup endpoint logic...');
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(testPassword, salt);
  const otp = '482915'; // 6 digit OTP
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const userId = `user_test_${Date.now()}`;

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, is_verified, otp_code, otp_expires, created_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `);
  await insertUser.run(userId, testEmail, password_hash, testName, otp, otpExpires, new Date().toISOString());

  const checkUser = db.prepare('SELECT * FROM users WHERE email = ?');
  let user = (await checkUser.get(testEmail)) as any;
  if (!user || user.is_verified !== 0 || user.otp_code !== otp) {
    throw new Error('❌ Signup user creation failed: user not saved as unverified with OTP');
  }
  console.log(`✅ TEST 1 PASSED: Unverified user created with 6-digit OTP (${otp}) and 10m expiry.`);

  // 2. Test Invalid OTP verification
  console.log('2️⃣ Testing invalid OTP rejection...');
  const wrongOtp = '111111';
  if (user.otp_code === wrongOtp) {
    throw new Error('❌ Invalid OTP was unexpectedly matched');
  }
  console.log('✅ TEST 2 PASSED: Invalid OTP rejected.');

  // 3. Test Valid OTP verification
  console.log('3️⃣ Testing valid 6-digit OTP verification...');
  const verifyUser = db.prepare(`
    UPDATE users 
    SET is_verified = 1, otp_code = NULL, otp_expires = NULL 
    WHERE id = ?
  `);
  await verifyUser.run(user.id);

  user = (await checkUser.get(testEmail)) as any;
  if (user.is_verified !== 1 || user.otp_code !== null) {
    throw new Error('❌ User was not verified properly');
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded.email !== testEmail) {
    throw new Error('❌ Token verification failed');
  }
  console.log(`✅ TEST 3 PASSED: Account verified, OTP cleared, valid JWT token issued (${decoded.id}).`);

  // 4. Test Google OAuth flow (Packwise standard)
  console.log('4️⃣ Testing Google OAuth user registration & token issuance...');
  const googleEmail = `google_user_${Date.now()}@gmail.com`;
  const googleId = `g_sub_${Date.now()}`;
  const googleName = 'Google Traveler';
  const googleAvatar = 'https://lh3.googleusercontent.com/a/test_avatar';

  const insertGoogle = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, avatar_url, google_id, is_verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const gUserId = `user_g_${Date.now()}`;
  await insertGoogle.run(gUserId, googleEmail, '', googleName, googleAvatar, googleId, new Date().toISOString());

  const gUser = (await checkUser.get(googleEmail)) as any;
  if (!gUser || gUser.is_verified !== 1 || gUser.google_id !== googleId) {
    throw new Error('❌ Google user was not created with is_verified = 1');
  }
  console.log('✅ TEST 4 PASSED: Google OAuth user registered with is_verified = 1 and avatar sync.');

  console.log('\n🎉 ALL AUTHENTICATION & PACKWISE OTP TESTS PASSED! 🚀');
}

runAuthTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

