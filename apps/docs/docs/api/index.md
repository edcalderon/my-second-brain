---
sidebar_position: 3
---

# API Reference

Comprehensive API documentation for Edward's Second Brain system components.

## Supermemory API

The core AI service for knowledge processing and memory management.

### Authentication

```javascript
// API Key is exposed in client (GitHub Pages limitation)
const apiKey = process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY;
```

### Memory Operations

#### Add Memory
```typescript
interface AddMemoryRequest {
  content: string;
  containerTags?: string[];
}

interface AddMemoryResponse {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
}

// Usage
const response = await supermemory.memories.add({
  content: "Your knowledge content here",
  containerTags: ["personal", "work"]
});
```

#### Search Memories
```typescript
interface SearchRequest {
  q: string;
  containerTags?: string[];
}

interface SearchResponse {
  results: Array<{
    content: string;
    metadata: any;
    chunks: Array<{
      content: string;
      metadata: any;
    }>;
  }>;
}

// Usage
const results = await supermemory.search.execute({
  q: "machine learning",
  containerTags: ["ai", "research"]
});
```

## Firebase Services

### Authentication

```typescript
import { auth } from '@/lib/firebase';

// Sign in with email/password
await signInWithEmailAndPassword(auth, email, password);

// Sign up
await createUserWithEmailAndPassword(auth, email, password);

// Sign out
await signOut(auth);
```

### Firestore Database

```typescript
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Add document
await addDoc(collection(db, 'memories'), {
  content: 'Memory content',
  userId: user.uid,
  createdAt: new Date()
});

// Query documents
const querySnapshot = await getDocs(collection(db, 'memories'));
querySnapshot.forEach((doc) => {
  console.log(doc.id, ' => ', doc.data());
});
```

## Versioning CLI

### Commands

```bash
# Version bumping
npx @edcalderon/versioning patch    # 1.0.0 → 1.0.1
npx @edcalderon/versioning minor    # 1.0.0 → 1.1.0
npx @edcalderon/versioning major    # 1.0.0 → 2.0.0

# Validation
npx @edcalderon/versioning validate # Check version sync

# Changelog
npx @edcalderon/versioning changelog # Generate changelog

# Re-entry + Roadmap
npx @edcalderon/versioning reentry init
npx @edcalderon/versioning reentry set --phase development --next "Verify sync idempotence"
npx @edcalderon/versioning reentry sync

npx @edcalderon/versioning roadmap init --title "My Project"
npx @edcalderon/versioning roadmap list
npx @edcalderon/versioning roadmap set-milestone --id "now-01" --title "Ship stable integration"
npx @edcalderon/versioning roadmap add --section "Now (1–2 weeks)" --id "now-02" --item "Add observability"
```

### ROADMAP.md format (copy/paste)

Only the block between these markers is auto-managed:

- `<!-- roadmap:managed:start -->`
- `<!-- roadmap:managed:end -->`

Milestone items are parsed from bullets that match:

- `/^\s*-\s*\[(.+?)\]\s*(.+)$/`

Example:

```md
## Now (1–2 weeks)

- [now-01] Ship stable integration
```

### Configuration

```json
// versioning.config.json
{
  "rootPackageJson": "package.json",
  "packages": ["apps/dashboard", "apps/docs"],
  "changelogFile": "CHANGELOG.md",
  "conventionalCommits": true,
  "syncDependencies": true,
  "ignorePackages": ["packages/versioning"]
}
```

## Environment Variables

### Required Variables

| Variable | Description | Used In |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPERMEMORY_API_KEY` | Supermemory API access | Dashboard |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase project key | Dashboard |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Dashboard |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Dashboard |
| `SUPERMEMORY_API_KEY` | Server-side API key | GitHub Actions |

### Setting Environment Variables

#### Local Development
```bash
# .env.local
NEXT_PUBLIC_SUPERMEMORY_API_KEY=your-key-here
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-key
```

#### GitHub Secrets
- Go to repository Settings → Secrets and variables → Actions
- Add each variable as a repository secret
- Reference in workflows as `${{ secrets.VARIABLE_NAME }}`

## Error Handling

### Common Errors

#### Supermemory API Errors
```typescript
try {
  const result = await supermemory.memories.add(memoryData);
} catch (error) {
  if (error.message.includes('API_KEY')) {
    console.error('Invalid API key');
  } else if (error.message.includes('RATE_LIMIT')) {
    console.error('Rate limit exceeded');
  }
}
```

#### Firebase Errors
```typescript
import { FirebaseError } from 'firebase/app';

try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        console.error('User not found');
        break;
      case 'auth/wrong-password':
        console.error('Wrong password');
        break;
    }
  }
}
```

## Rate Limits

- **Supermemory API**: 1000 requests/hour (free tier)
- **Firebase**: Varies by service
- **GitHub Pages**: No specific rate limits

## Security Considerations

- API keys are exposed in client-side code (GitHub Pages limitation)
- Use Firebase security rules for data access control
- Monitor API usage for abuse
- Rotate API keys regularly