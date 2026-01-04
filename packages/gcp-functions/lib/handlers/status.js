"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStatus = handleStatus;
/**
 * Status handler - mirrors Next.js API route
 * Import and adapt logic from apps/dashboard/src/app/api/status/route.ts
 */
async function handleStatus(req, res) {
    try {
        if (req.method === 'GET') {
            // Return system status
            res.status(200).json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'unknown',
            });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Status handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=status.js.map