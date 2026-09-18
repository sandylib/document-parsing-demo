import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ObjectStorage } from '../../application/ports/object-storage.port.js';
@Injectable()
export class LocalObjectStorageAdapter implements ObjectStorage {
  private readonly root: string;
  constructor(config: ConfigService) { this.root=resolve(process.cwd(),config.get('STORAGE_PATH','../../storage')); }
  private path(key:string){ if(!/^[a-zA-Z0-9._-]+$/.test(key)) throw new Error('Invalid storage key'); return resolve(this.root,key); }
  async put(key:string,content:Buffer){ await mkdir(this.root,{recursive:true}); await writeFile(this.path(key),content); }
  get(key:string){ return readFile(this.path(key)); }
  async delete(key:string){ await rm(this.path(key),{force:true}); }
}
