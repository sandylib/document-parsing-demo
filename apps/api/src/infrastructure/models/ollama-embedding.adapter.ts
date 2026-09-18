import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingModel } from '../../application/ports/model.port.js';
@Injectable()
export class OllamaEmbeddingAdapter implements EmbeddingModel {
  readonly profile:string; readonly dimensions:number; private readonly baseUrl:string;
  constructor(config:ConfigService){this.baseUrl=config.get('OLLAMA_BASE_URL','http://localhost:11434');this.profile=config.get('OLLAMA_EMBEDDING_MODEL','qwen3-embedding:0.6b');this.dimensions=Number(config.get('EMBEDDING_DIMENSIONS','1024'));}
  async embed(texts:string[]){const response=await fetch(`${this.baseUrl}/api/embed`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:this.profile,input:texts,dimensions:this.dimensions,truncate:true})});if(!response.ok)throw new Error(`Ollama embedding failed: ${response.status}`);const body=await response.json() as {embeddings:number[][]};if(body.embeddings.some(v=>v.length!==this.dimensions))throw new Error('Embedding dimension does not match configured database dimension');return body.embeddings;}
  async health(){try{return (await fetch(`${this.baseUrl}/api/tags`)).ok}catch{return false}}
}
