import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsModule } from './ads/ads.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createTypeOrmOptions } from './database/typeorm.config';
import { FirebaseModule } from './firebase/firebase.module';
import { MeModule } from './me/me.module';
import { PlacesModule } from './places/places.module';
import { RoutesModule } from './routes/routes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';
import { TranslateModule } from './translate/translate.module';

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
