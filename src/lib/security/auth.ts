import { NextRequest } from 'next/server';
import { User } from '@/types';
import { getUser } from '@/lib/db';

const DEFAULT_DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@lexilens.ai',
  name: 'LexiLens Demo User',
  role: 'user',
  createdAt: new Date().toISOString()
};

export async function getSessionUser(req?: NextRequest): Promise<User> {
  // Check for Authorization header: Bearer <userId>
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const user = getUser(token);
        if (user) return user;
        // If custom token, treat as userId
        return {
          id: token,
          email: `${token}@lexilens.local`,
          name: `User ${token}`,
          role: 'user',
          createdAt: new Date().toISOString()
        };
      }
    }

    // Check cookie
    const cookieUser = req.cookies.get('lexilens_user_id')?.value;
    if (cookieUser) {
      const user = getUser(cookieUser);
      if (user) return user;
      return {
        id: cookieUser,
        email: `${cookieUser}@lexilens.local`,
        name: `User ${cookieUser}`,
        role: 'user',
        createdAt: new Date().toISOString()
      };
    }
  }

  // Fallback to default demo user for seamless hackathon / test environment
  return DEFAULT_DEMO_USER;
}

export function enforceDocumentOwnership(documentOwnerId: string, currentUserId: string): boolean {
  if (!documentOwnerId || !currentUserId) return false;
  return documentOwnerId === currentUserId;
}
