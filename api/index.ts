import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from '../src/app.module';
import { AppExceptionFilter } from '../src/common/filters/app-exception.filter';
import { createAppValidationPipe } from '../src/common/pipes/app-validation.pipe';

let cachedServer: express.Express;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

    app.useGlobalPipes(createAppValidationPipe());
    app.useGlobalFilters(new AppExceptionFilter());
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'api/v',
      defaultVersion: '1',
    });

    const swaggerConfig = new DocumentBuilder()
      .setTitle('InteractiveMapUniandes Backend')
      .setDescription('Browser-based documentation and testing UI for the InteractiveMapUniandes backend.')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID token. In local development, if FIREBASE_DEV_AUTH=true, you can also use Bearer dev:<uid>|<email>|<name>.',
        },
        'firebase',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async (req: any, res: any) => {
  const server = await bootstrap();
  server(req, res);
};
