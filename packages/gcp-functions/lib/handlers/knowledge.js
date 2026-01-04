"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleKnowledge = handleKnowledge;
/**
 * Knowledge handler - mirrors Next.js API route
 * Import and adapt logic from apps/dashboard/src/app/api/knowledge/route.ts
 */
async function handleKnowledge(req, res) {
    try {
        if (req.method === 'GET') {
            // Handle GET requests
            res.status(200).json({ message: 'Knowledge GET endpoint' });
        }
        else if (req.method === 'POST') {
            // Handle POST requests
            const { body } = req;
            res.status(200).json({ message: 'Knowledge POST endpoint', received: body });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Knowledge handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=knowledge.js.map