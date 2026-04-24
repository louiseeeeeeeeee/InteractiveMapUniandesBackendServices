import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { FirebaseAdminService } from './firebase-admin.service';

export interface StoredIcsFile {
  fileName: string;
  storageBucket?: string | null;
  storagePath: string;
  storageProvider: 'firebase_storage' | 'local_fs';
}

@Injectable()
export class FirebaseStorageService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async saveUserIcsFile(params: {
    firebaseUid: string;
    fileName: string;
    fileBuffer: Buffer;
  }): Promise<StoredIcsFile> {
    const sanitizedFileName = this.sanitizeFileName(params.fileName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storagePath = `users/${params.firebaseUid}/schedules/${timestamp}-${sanitizedFileName}`;
    const bucket = this.firebaseAdminService.getStorageBucketOrNull();

    if (bucket) {
      try {
        const file = bucket.file(storagePath);
        await file.save(params.fileBuffer, {
          resumable: false,
          metadata: {
            contentType: 'text/calendar; charset=utf-8',
          },
        });

        return {
          fileName: sanitizedFileName,
          storageBucket: bucket.name,
          storagePath,
          storageProvider: 'firebase_storage',
        };
      } catch (err) {
        // Fall through to local fs / skip on creds errors
      }
    }

    // On Vercel the cwd is read-only, try local_fs but swallow failure.
    try {
      const absolutePath = join(process.cwd(), 'storage', ...storagePath.split('/'));
      await fs.mkdir(dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, params.fileBuffer);
      return {
        fileName: sanitizedFileName,
        storageBucket: null,
        storagePath,
        storageProvider: 'local_fs',
      };
    } catch {
      // Serverless, no writable FS. The ICS content is still parsed into Postgres
      // so the class list works — we just skip archiving the raw file.
      return {
        fileName: sanitizedFileName,
        storageBucket: null,
        storagePath: 'not-stored',
        storageProvider: 'local_fs',
      };
    }
  }

  private sanitizeFileName(fileName: string) {
    return fileName
      .trim()
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'schedule.ics';
  }
}
