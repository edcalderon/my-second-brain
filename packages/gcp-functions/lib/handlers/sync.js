"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSync = handleSync;
/**
 * Sync handler - mirrors Next.js API route
 * Import and adapt logic from apps/dashboard/src/app/api/sync/route.ts
 */
async function handleSync(req, res) {
    try {
        if (req.method === 'POST') {
            // Handle sync requests
            const { body } = req;
            res.status(200).json({ message: 'Sync POST endpoint', received: body });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Sync handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=sync.js.map