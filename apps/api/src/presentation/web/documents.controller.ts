import { Body, Controller, Get, Headers, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { AuthorizationPolicy } from '../../application/ports/authorization.port.js';
import { AUTHORIZATION_POLICY } from '../../application/ports/tokens.js';
import { Inject } from '@nestjs/common';
import { ListDocumentsUseCase } from '../../application/use-cases/list-documents.use-case.js';
import { SearchKnowledgeUseCase } from '../../application/use-cases/search-knowledge.use-case.js';
import { UploadDocumentUseCase } from '../../application/use-cases/upload-document.use-case.js';
import { SearchDto, UploadDocumentDto } from './dto.js';
@ApiTags('documents') @Controller('documents')
export class DocumentsController {
  constructor(private readonly upload:UploadDocumentUseCase,private readonly listUseCase:ListDocumentsUseCase,private readonly search:SearchKnowledgeUseCase,@Inject(AUTHORIZATION_POLICY)private readonly auth:AuthorizationPolicy){}
  @Post() @ApiConsumes('multipart/form-data') @ApiBody({schema:{type:'object',properties:{file:{type:'string',format:'binary'},documentId:{type:'string',format:'uuid'},title:{type:'string'},visibility:{type:'string',enum:['public','staff']}}}}) @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile()file:Express.Multer.File,@Body()body:UploadDocumentDto){return this.upload.execute({file,documentId:body.documentId,title:body.title,visibility:body.visibility??'public'});}
  @Get() list(){return this.listUseCase.execute();}
  @Get('search') searchDocuments(@Query()query:SearchDto,@Headers('x-demo-role')role?:string){return this.search.execute(query.query,this.auth.roleFrom(role));}
}
