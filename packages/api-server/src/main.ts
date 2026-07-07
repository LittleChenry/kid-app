import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  (app as any).useBodyParser('json', { limit: '10mb' });
  await app.listen(4000);
  console.log('API Server running on http://localhost:4000');
}
bootstrap();
