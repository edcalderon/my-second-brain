import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';

// Skip this route during static export
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || undefined;

        if (!db) {
            return NextResponse.json({ 
                error: 'Firebase not configured',
                status: 'unavailable'
            }, { status: 503 });
        }

        const collectionRef = collection(db, "knowledge_base");
        
        const countQuery = source 
            ? query(collectionRef, where('metadata.source', '==', source))
            : collectionRef;
        const countSnapshot = await getCountFromServer(countQuery);
        const totalCount = countSnapshot.data().count;

        const recentQuery = query(
            collectionRef, 
            orderBy("created_at", "desc"), 
            limit(1)
        );
        const recentSnapshot = await getDocs(recentQuery);
        
        const lastSync = recentSnapshot.empty ? null : recentSnapshot.docs[0].data()?.created_at;

        const last24hQuery = query(
            collectionRef,
            where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        );
        const last24hSnapshot = await getCountFromServer(last24hQuery);
        const last24hCount = last24hSnapshot.data().count;

        return NextResponse.json({
            status: 'healthy',
            knowledgeBase: {
                totalEntries: totalCount,
                lastSync,
                entriesLast24h: last24hCount
            },
            filters: {
                source: source || 'all'
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ 
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}