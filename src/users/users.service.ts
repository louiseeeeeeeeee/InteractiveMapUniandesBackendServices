import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { Schedule } from '../schedules/entities/schedule.entity';
import { UserPreference } from './entities/user-preference.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';

export interface FirebaseIdentityPayload {
  uid: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreference)
    private readonly userPreferenceRepository: Repository<UserPreference>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async getOrCreateFromFirebaseIdentity(identity: FirebaseIdentityPayload) {
    const normalizedEmail = identity.email?.trim().toLowerCase() || null;
    let user = await this.userRepository.findOne({
      where: { firebaseUid: identity.uid },
      relations: {
        profile: true,
        preference: true,
      },
    });

    if (!user && normalizedEmail) {
      user = await this.userRepository.findOne({
        where: { email: normalizedEmail },
        relations: {
          profile: true,
          preference: true,
        },
      });
    }

    const resolvedAuthProvider = this.mapFirebaseProvider(identity.provider);

    if (!user) {
      user = this.userRepository.create({
        firebaseUid: identity.uid,
        email: normalizedEmail,
        authProvider: resolvedAuthProvider,
      });
    } else {
      user.firebaseUid = user.firebaseUid ?? identity.uid;
      user.email = user.email ?? normalizedEmail;
      user.authProvider =
        user.authProvider === AuthProvider.GUEST
          ? resolvedAuthProvider
          : user.authProvider;
    }

    const savedUser = await this.userRepository.save(user);
    await this.ensurePreference(savedUser);
    await this.ensureProfile(savedUser, identity);

    return this.getUserById(savedUser.id);
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        profile: true,
        preference: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }

    return user;
  }

  async getCurrentUserOverview(id: string) {
    const [user, latestSchedule, scheduleCount] = await Promise.all([
      this.getUserById(id),
      this.scheduleRepository.findOne({
        where: { user: { id } },
        order: {
          importedAt: 'DESC',
          createdAt: 'DESC',
        },
      }),
      this.scheduleRepository.count({
        where: { user: { id } },
      }),
    ]);

    return {
      ...user,
      latestSchedule,
      scheduleCount,
    };
  }

  async updateProfile(userId: string, patch: Partial<UserProfile>) {
    const existing = await this.userProfileRepository.findOne({
      where: { user: { id: userId } }, // Look up by user relation
    });
    if (existing) {
      Object.assign(existing, patch); // Merge partial fields
      return this.userProfileRepository.save(existing);
    }
    const user = await this.getUserById(userId);
    return this.userProfileRepository.save(
      this.userProfileRepository.create({ user, ...patch }),
    );
  }

  async updatePreferences(userId: string, patch: Partial<UserPreference>) {
    const existing = await this.userPreferenceRepository.findOne({
      where: { user: { id: userId } },
    });
    if (existing) {
      Object.assign(existing, patch);
      return this.userPreferenceRepository.save(existing);
    }
    const user = await this.getUserById(userId);
    return this.userPreferenceRepository.save(
      this.userPreferenceRepository.create({ user, ...patch }),
    );
  }

  private async ensurePreference(user: User) {
    if (user.preference) {
      return user.preference;
    }

    return this.userPreferenceRepository.save(
      this.userPreferenceRepository.create({
        user,
      }),
    );
  }

  private async ensureProfile(user: User, identity: FirebaseIdentityPayload) {
    if (user.profile) {
      let shouldPersist = false;

      if (!user.profile.fullName?.trim() && identity.name?.trim()) {
        user.profile.fullName = identity.name.trim();
        shouldPersist = true;
      }

      if (!user.profile.profileImage?.trim() && identity.picture?.trim()) {
        user.profile.profileImage = identity.picture.trim();
        shouldPersist = true;
      }

      if (shouldPersist) {
        return this.userProfileRepository.save(user.profile);
      }

      return user.profile;
    }

    if (!identity.name?.trim() && !identity.picture?.trim()) {
      return null;
    }

    return this.userProfileRepository.save(
      this.userProfileRepository.create({
        user,
        fullName: identity.name?.trim() || identity.email?.trim() || user.id,
        profileImage: identity.picture?.trim() || null,
      }),
    );
  }

  private mapFirebaseProvider(provider?: string | null) {
    const normalizedProvider = provider?.trim().toLowerCase();

    switch (normalizedProvider) {
      case 'google.com':
        return AuthProvider.GOOGLE;
      case 'password':
      case 'email':
      case 'email_link':
      case 'email/password':
        return AuthProvider.EMAIL;
      case 'microsoft.com':
      case 'microsoftonline.com':
      case 'oidc.microsoft':
      case 'oidc.microsoft.com':
        return AuthProvider.MICROSOFT;
      case 'anonymous':
        return AuthProvider.GUEST;
      default:
        return AuthProvider.FIREBASE;
    }
  }
}
