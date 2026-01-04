import { Request, Response } from 'express';

/**
 * Status handler - mirrors Next.js API route
 * Import and adapt logic from apps/dashboard/src/app/api/status/route.ts
 */
export async function handleStatus(req: Request, res: Response) {
  try {
    if (req.method === 'GET') {
      // Return system status
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Status handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
