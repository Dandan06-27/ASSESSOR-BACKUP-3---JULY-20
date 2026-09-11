import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, type Request, type Response, type NextFunction, urlencoded } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { AppModule } from './app.module';

process.env.TZ = 'Asia/Manila';

const htmlAliases = new Map([
  ['/tracer', 'tracer.html'],
  ['/print', 'print.html'],
  ['/tracerprint', 'tracerprint.html'],
  ['/parcel', 'parcel.html'],
]);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendRoot = path.join(__dirname, '..', '..', 'frontend');

  app.enableCors({ origin: true, credentials: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const targetFile = htmlAliases.get(req.path);
    if (!targetFile) {
      next();
      return;
    }

    const filePath = path.join(frontendRoot, targetFile);
    if (!fs.existsSync(filePath)) {
      next();
      return;
    }

    res.sendFile(filePath);
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Land Bookkeeping System running at http://0.0.0.0:${port}`);
}
bootstrap();
