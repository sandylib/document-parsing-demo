import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ProcessNextJobUseCase } from './application/use-cases/process-next-job.use-case.js';
const app=await NestFactory.createApplicationContext(AppModule,{logger:['log','error','warn']});const processor=app.get(ProcessNextJobUseCase);let stopping=false;process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true});while(!stopping){const processed=await processor.execute();if(!processed)await new Promise(resolve=>setTimeout(resolve,1000));}await app.close();
