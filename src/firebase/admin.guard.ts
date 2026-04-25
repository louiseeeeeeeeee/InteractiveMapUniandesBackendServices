import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './interfaces/authenticated-user-context.interface';

// AdminGuard runs after FirebaseAuthGuard and rejects callers that aren't flagged admin.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.authenticatedUser?.user;
    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin privileges required.');
    }
    return true;
  }
}
