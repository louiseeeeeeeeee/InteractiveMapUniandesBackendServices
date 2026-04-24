import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { environment } from '../common/config/environment.util';

interface FirebaseServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

@Injectable()
export class FirebaseAdminService {
  private readonly app = this.initializeApp();

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    if (this.isDevAuthEnabled() && token.startsWith('dev:')) {
      return this.buildDevToken(token);
    }

    const auth = this.getAuth();

    try {
      return await auth.verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token.');
    }
  }

  isConfigured() {
    return Boolean(this.app);
  }

  getStorageBucketOrNull() {
    if (!this.app?.options.storageBucket) {
      return null;
    }

    return admin.storage(this.app).bucket();
  }

  private getAuth() {
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or the FIREBASE_* credentials before using /me endpoints.',
      );
    }

    return admin.auth(this.app);
  }

  private initializeApp() {
    if (admin.apps.length > 0) {
      return admin.app();
    }

    const storageBucket = environment.firebaseStorageBucket;
    const hasApplicationDefaultCredentials = Boolean(
      environment.googleApplicationCredentials ||
        environment.firebaseAuthEmulatorHost ||
        environment.gcpCloudRunService ||
        environment.gcpFunctionTarget,
    );

    const serviceAccountPath = environment.firebaseServiceAccountPath;

    if (serviceAccountPath) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        storageBucket: storageBucket || undefined,
      });
    }

    const inlineServiceAccount = this.readInlineServiceAccount();
    if (inlineServiceAccount) {
      return admin.initializeApp({
        credential: admin.credential.cert(inlineServiceAccount),
        storageBucket: storageBucket || undefined,
      });
    }

    if (hasApplicationDefaultCredentials) {
      return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: storageBucket || undefined,
      });
    }

    // Fallback: init with just the project id. verifyIdToken still works
    // because it uses Google's public JWKS (no private key needed).
    const projectId = environment.firebaseProjectId;
    if (projectId) {
      return admin.initializeApp({
        projectId,
        storageBucket: storageBucket || undefined,
      });
    }

    return undefined;
  }

  private readInlineServiceAccount(): FirebaseServiceAccount | undefined {
    const projectId = environment.firebaseProjectId;
    const clientEmail = environment.firebaseClientEmail;
    const privateKey = environment.firebasePrivateKey?.trim();

    if (!projectId || !clientEmail || !privateKey) {
      return undefined;
    }

    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  private isDevAuthEnabled() {
    return environment.firebaseDevAuth;
  }

  private buildDevToken(token: string): DecodedIdToken {
    const rawPayload = token.slice(4).trim();
    const [uid, email, name] = rawPayload
      .split('|')
      .map((value) => value?.trim());

    if (!uid) {
      throw new UnauthorizedException(
        'Invalid dev token. Use Bearer dev:<uid>|<email>|<name> when FIREBASE_DEV_AUTH=true.',
      );
    }

    const timestampSeconds = Math.floor(Date.now() / 1000);

    return {
      aud: 'dev-project',
      auth_time: timestampSeconds,
      exp: timestampSeconds + 3600,
      firebase: {
        identities: {},
        sign_in_provider: 'custom',
      },
      iat: timestampSeconds,
      iss: 'https://securetoken.google.com/dev-project',
      sub: uid,
      uid,
      email: email || undefined,
      email_verified: Boolean(email),
      name: name || undefined,
    } as DecodedIdToken;
  }
}
