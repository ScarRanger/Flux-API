// Client-side API utilities - no server-only imports
import { User } from '@/lib/types';

export class ApiClient {
  static async createOrGetUser(firebaseUser: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role?: 'buyer' | 'seller';
  }): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUID: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: firebaseUser.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      return userData.user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  static async updateLastLogin(firebaseUID: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUID,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating last login:', error);
      return false;
    }
  }

  static async getWalletInfo(firebaseUID: string): Promise<{ address: string } | null> {
    try {
      const response = await fetch('/api/wallet/instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUID,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get wallet info');
      }

      const data = await response.json();
      return data.wallet;
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return null;
    }
  }
}