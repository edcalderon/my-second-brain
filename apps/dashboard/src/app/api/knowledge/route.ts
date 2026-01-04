import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, limit, getDocs, startAfter, DocumentSnapshot, where, getCountFromServer } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        if (!db) {
            return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const source = searchParams.get('source');

        if (page < 1 || pageSize < 1 || pageSize > 50) {
            return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
        }

        const collectionRef = collection(db, "knowledge_base");
        let baseQuery = query(collectionRef, orderBy("created_at", "desc"));

        if (source) {
            baseQuery = query(baseQuery, where('metadata.source', '==', source));
        }

        const countQuery = source 
            ? query(collectionRef, where('metadata.source', '==', source))
            : collectionRef;
        const countSnapshot = await getCountFromServer(countQuery);
        const totalCount = countSnapshot.data().count;

        const offset = (page - 1) * pageSize;
        let lastDoc: DocumentSnapshot | undefined;

        if (page > 1) {
            const previousQuery = query(baseQuery, limit(offset));
            const previousDocs = await getDocs(previousQuery);
            if (!previousDocs.empty) {
                lastDoc = previousDocs.docs[previousDocs.docs.length - 1];
            }
        }

        const currentQuery = lastDoc 
            ? query(baseQuery, startAfter(lastDoc), limit(pageSize))
            : query(baseQuery, limit(pageSize));

        const snapshot = await getDocs(currentQuery);
        const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const totalPages = Math.ceil(totalCount / pageSize);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return NextResponse.json({
            entries,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage,
                source
            }
        });

    } catch (error) {
        console.error('Error fetching knowledge base:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}