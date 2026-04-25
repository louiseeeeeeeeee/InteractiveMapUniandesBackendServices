import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseStorageService } from './firebase-storage.service';

@Global()
@Module({
  imports: [UsersModule],
  providers: [
    AdminGuard,
    FirebaseAdminService,
    FirebaseAuthGuard,
    FirebaseStorageService,
  ],
  exports: [
    AdminGuard,
    FirebaseAdminService,
    FirebaseAuthGuard,
    FirebaseStorageService,
  ],
})
export class FirebaseModule {}
