import { Request, Response } from 'express';

/**
 * Sync handler - mirrors Next.js API route
 * Import and adapt logic from apps/dashboard/src/app/api/sync/route.ts
 */
export async function handleSync(req: Request, res: Response) {
  try {
    if (req.method === 'POST') {
      // Handle sync requests
      const { body } = req;
      res.status(200).json({ message: 'Sync POST endpoint', received: body });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Sync handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
