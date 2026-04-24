import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { environment } from '../common/config/environment.util';

export function createTypeOrmOptions(): TypeOrmModuleOptions & DataSourceOptions {
  if (
    environment.dbSynchronize &&
    (environment.gcpCloudRunService || environment.gcpFunctionTarget)
  ) {
    throw new Error(
      'DB_SYNCHRONIZE=true is not allowed on managed GCP runtimes. Run migrations instead.',
    );
  }

  const isVercelPostgres = !!environment.postgresUrl;

  return {
    type: 'postgres',
    ...(isVercelPostgres
      ? {
          url: environment.postgresUrl,
          ssl: { rejectUnauthorized: false }, // Required by Vercel Postgres
        }
      : {
          host: environment.dbHost,
          port: environment.dbPort,
          username: environment.dbUsername,
          password: environment.dbPassword,
          database: environment.dbName,
        }),
    uuidExtension: 'uuid-ossp',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: environment.dbSynchronize,
  };
}
