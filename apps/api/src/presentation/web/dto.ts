import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class UploadDocumentDto {
  @IsOptional() @IsString() documentId?:string;
  @IsOptional() @IsString() @MaxLength(200) title?:string;
  @IsOptional() @IsIn(['public','staff']) visibility:'public'|'staff'='public';
}
export class SearchDto { @IsString() @MinLength(2) @MaxLength(500) query:string; }
export class ChatDto { @IsString() @MinLength(2) @MaxLength(1000) question:string; }
