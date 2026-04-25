import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsModule } from './ads/ads.module';
import { AlertsModule } from './alerts/alerts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createTypeOrmOptions } from './database/typeorm.config';
import { FavoritesModule } from './favorites/favorites.module';
import { FirebaseModule } from './firebase/firebase.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlacesModule } from './places/places.module';
import { RoutesModule } from './routes/routes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';
import { TranslateModule } from './translate/translate.module';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true, ttl: 300_000, max: 500 }), // In-memory cache 5min
    TypeOrmModule.forRoot(createTypeOrmOptions()),
    FirebaseModule,
    UsersModule,
    SchedulesModule,
    PlacesModule,
    RoutesModule,
    SetupModule,
    MeModule,
    AnalyticsModule,
    AdsModule,
    TranslateModule,
    NotificationsModule,
    AlertsModule,
    FavoritesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
