import { Pool } from 'pg';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { User } from '@/lib/types';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here';
const ALGORITHM = 'aes-256-gcm';

export function encryptPrivateKey(privateKey: string, salt: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY + salt, 'salt', 32);
  const iv = crypto.randomBytes(12); // 12 bytes for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // Store iv and authTag with the encrypted data (hex encoded, separated by ':')
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPrivateKey(encryptedKey: string, salt: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');
  const key = crypto.scryptSync(ENCRYPTION_KEY + salt, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Database functions
export class WalletDB {
  // Create a new user with wallet
  static async createUser(firebaseUser: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<User> {
    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const salt = crypto.randomBytes(16).toString('hex');
    const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey, salt);

    const query = `
      INSERT INTO users (
        firebase_uid, email, display_name, photo_url, 
        wallet_address, encrypted_private_key, encryption_salt,
        is_active, created_at, updated_at, last_login
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
      RETURNING *
    `;

    const values = [
      firebaseUser.uid,
      firebaseUser.email,
      firebaseUser.displayName || null,
      firebaseUser.photoURL || null,
      wallet.address,
      encryptedPrivateKey,
      salt,
      true
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by Firebase UID
  static async getUserByFirebaseUID(firebaseUID: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE firebase_uid = $1';
    
    try {
      const result = await pool.query(query, [firebaseUID]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      throw error;
    }
  }

  // Get user by wallet address
  static async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    
    try {
      const result = await pool.query(query, [walletAddress]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by wallet address:', error);
      throw error;
    }
  }

  // Update user last login
  static async updateLastLogin(firebaseUID: string): Promise<void> {
    const query = 'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE firebase_uid = $1';
    
    try {
      await pool.query(query, [firebaseUID]);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Get decrypted private key (use with caution)
  static async getDecryptedPrivateKey(firebaseUID: string): Promise<string | null> {
    const user = await this.getUserByFirebaseUID(firebaseUID);
    if (!user) return null;

    try {
      return decryptPrivateKey(user.encrypted_private_key, user.encryption_salt);
    } catch (error) {
      console.error('Error decrypting private key:', error);
      throw error;
    }
  }

  // Create wallet instance for user
  static async createWalletInstance(firebaseUID: string): Promise<ethers.Wallet | null> {
    const privateKey = await this.getDecryptedPrivateKey(firebaseUID);
    if (!privateKey) return null;

    return new ethers.Wallet(privateKey);
  }

  // Update user profile
  static async updateUserProfile(
    firebaseUID: string, 
    updates: Partial<Pick<User, 'display_name' | 'photo_url' | 'email'>>
  ): Promise<User | null> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE firebase_uid = $1
      RETURNING *
    `;

    const values = [firebaseUID, ...Object.values(updates)];

    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Deactivate user
  static async deactivateUser(firebaseUID: string): Promise<void> {
    const query = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE firebase_uid = $1';
    
    try {
      await pool.query(query, [firebaseUID]);
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Initialize user balances
  static async initializeUserBalances(userID: string): Promise<void> {
    const query = `
      INSERT INTO user_balances (user_id, escrow_balance, earnings_balance, total_spent, total_earned)
      VALUES ($1, 0, 0, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
    `;

    try {
      await pool.query(query, [userID]);
    } catch (error) {
      console.error('Error initializing user balances:', error);
      throw error;
    }
  }

  // Log audit event
  static async logAuditEvent(
    userID: string,
    action: string,
    resourceType?: string,
    resourceID?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        old_values, new_values, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;

    const values = [
      userID,
      action,
      resourceType || null,
      resourceID || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress || null,
      userAgent || null
    ];

    try {
      await pool.query(query, values);
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw here - audit logging shouldn't break the main flow
    }
  }
}

export default WalletDB;