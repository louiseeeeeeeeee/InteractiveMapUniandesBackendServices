function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readBooleanEnv(name: string, defaultValue = false) {
  const value = readEnv(name);

  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

function readNumberEnv(name: string, defaultValue: number) {
  const value = readEnv(name);

  if (!value) {
    return defaultValue;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

export const environment = {
  get appPort() {
    return readNumberEnv('PORT', readNumberEnv('APP_PORT', 3000));
  },
  get instanceConnectionName() {
    return readEnv('INSTANCE_CONNECTION_NAME');
  },
  get dbHost() {
    return (
      readEnv('POSTGRES_HOST') ??
      readEnv('DB_HOST') ??
      (this.instanceConnectionName
        ? `/cloudsql/${this.instanceConnectionName}`
        : 'localhost')
    );
  },
  get dbPort() {
    return readNumberEnv('DB_PORT', 5432);
  },
  get dbUsername() {
    return readEnv('POSTGRES_USER') ?? readEnv('DB_USERNAME') ?? 'postgres';
  },
  get dbPassword() {
    return readEnv('POSTGRES_PASSWORD') ?? readEnv('DB_PASSWORD') ?? '123';
  },
  get dbName() {
    return readEnv('POSTGRES_DATABASE') ?? readEnv('DB_NAME') ?? 'InteractiveMapUniandes';
  },
  get postgresUrl() {
    return readEnv('POSTGRES_URL');
  },
  get dbSynchronize() {
    return readBooleanEnv('DB_SYNCHRONIZE', false);
  },
  get enableSetupEndpoints() {
    return readBooleanEnv('ENABLE_SETUP_ENDPOINTS', false);
  },
  get setupApiKey() {
    return readEnv('SETUP_API_KEY');
  },
  get firebaseStorageBucket() {
    return readEnv('FIREBASE_STORAGE_BUCKET');
  },
  get firebaseServiceAccountPath() {
    return readEnv('FIREBASE_SERVICE_ACCOUNT_PATH');
  },
  get firebaseProjectId() {
    return readEnv('FIREBASE_PROJECT_ID');
  },
  get firebaseClientEmail() {
    return readEnv('FIREBASE_CLIENT_EMAIL');
  },
  get firebasePrivateKey() {
    return readEnv('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  },
  get firebaseDevAuth() {
    return readBooleanEnv('FIREBASE_DEV_AUTH', false);
  },
  get googleApplicationCredentials() {
    return readEnv('GOOGLE_APPLICATION_CREDENTIALS');
  },
  get firebaseAuthEmulatorHost() {
    return readEnv('FIREBASE_AUTH_EMULATOR_HOST');
  },
  get gcpCloudRunService() {
    return readEnv('K_SERVICE');
  },
  get gcpFunctionTarget() {
    return readEnv('FUNCTION_TARGET');
  },
};
