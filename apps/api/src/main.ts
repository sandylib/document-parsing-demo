import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
async function bootstrap(){const app=await NestFactory.create(AppModule);app.enableCors({origin:process.env.WEB_ORIGIN??'http://localhost:3000'});app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true}));const config=new DocumentBuilder().setTitle('Document Knowledge API').setVersion('1.0').build();SwaggerModule.setup('openapi',app,SwaggerModule.createDocument(app,config));await app.listen(process.env.API_PORT??3001,'127.0.0.1');}
await bootstrap();
