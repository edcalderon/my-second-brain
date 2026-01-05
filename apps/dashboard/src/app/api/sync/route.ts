import { NextRequest, NextResponse } from 'next/server';

// Skip this route during static export
export const dynamic = 'force-static';

const GCP_FUNCTION_URL = process.env.GCP_SYNC_FUNCTION_URL || 'https://us-central1-second-brain-482901.cloudfunctions.net/rocketbook-fetch';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { source = 'rocketbook', force = false } = body;

        // In development, return a mock response
        if (process.env.NODE_ENV === 'development') {
            return NextResponse.json({
                success: true,
                message: 'Sync completed successfully (dev mode)',
                processed: 0,
                timestamp: new Date().toISOString()
            });
        }

        const response = await fetch(GCP_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source,
                force,
                trigger: 'manual_sync'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GCP function failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        return NextResponse.json({
            success: true,
            message: result.message || 'Sync completed successfully',
            processed: result.totalProcessed || 0,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Sync API endpoint. Use POST to trigger manual sync.',
        parameters: {
            source: 'rocketbook (default)',
            force: 'boolean (default: false)'
        }
    });
}