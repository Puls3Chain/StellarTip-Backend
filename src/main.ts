import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors();

    // Global validation pipes with detailed options
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);

    // Check and log database connection status
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      logger.log('📦 Database connection established');
    }
    logger.log(`⚡ Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Error starting application:', error);
    process.exit(1);
  }
}

void bootstrap();
