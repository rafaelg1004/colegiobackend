// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import { type Request, type Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Fallback para diferentes estilos de exportación de cookie-parser
  const cookieParserMiddleware = (cookieParser as any).default || cookieParser;
  app.use(cookieParserMiddleware());

  // Healthcheck sin prefijo - usar Express raw
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // Prefijo global para todas las rutas: /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Cambiado a false para permitir campos adicionales
      transform: true,
    }),
  );

  // CORS - Configurado para Vercel + desarrollo local
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0'); // 0.0.0.0 es necesario para Docker
  console.log(`🏫 Backend Colegio corriendo en puerto ${port}`);
}
bootstrap();
