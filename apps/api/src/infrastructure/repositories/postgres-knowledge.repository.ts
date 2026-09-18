import { Injectable } from '@nestjs/common';
import type { AnswerRunRepository, CompletedProcessing, DocumentRepository, JobRepository, RetrievalRepository, UploadReceipt, UploadRegistration } from '../../application/ports/repositories.port.js';
import type { DocumentSummary, Evidence, Visibility } from '../../core/knowledge.types.js';
import { PostgresService } from '../database/postgres.service.js';

const vectorLiteral = (values: number[]) => `[${values.join(',')}]`;
@Injectable()
export class PostgresKnowledgeRepository implements DocumentRepository, JobRepository, RetrievalRepository, AnswerRunRepository {
  constructor(private readonly db: PostgresService) {}
  async registerUpload(input: UploadRegistration): Promise<UploadReceipt> {
    return this.db.transaction(async (client) => {
      const duplicate = await client.query<{ document_id: string; version_id: string; job_id: string }>(
        `SELECT v.document_id, v.id version_id, j.id job_id FROM document_versions v JOIN ingestion_jobs j ON j.version_id=v.id WHERE v.checksum=$1 ORDER BY j.created_at DESC LIMIT 1`, [input.checksum]);
      if (duplicate.rows[0]) return { documentId: duplicate.rows[0].document_id, versionId: duplicate.rows[0].version_id, jobId: duplicate.rows[0].job_id, duplicate: true };
      const document = input.documentId
        ? await client.query<{ id: string }>(`UPDATE documents SET title=COALESCE(NULLIF($2,''),title),visibility=$3 WHERE id=$1 RETURNING id`, [input.documentId, input.title, input.visibility])
        : await client.query<{ id: string }>('INSERT INTO documents(title, visibility) VALUES($1,$2) RETURNING id', [input.title, input.visibility]);
      if (!document.rows[0]) throw new Error('Target document not found');
      const versionNumber = await client.query<{ next: number }>('SELECT COALESCE(MAX(version_number),0)+1 next FROM document_versions WHERE document_id=$1', [document.rows[0].id]);
      const version = await client.query<{ id: string }>(`INSERT INTO document_versions(document_id,version_number,checksum,mime_type,original_name,storage_key,pipeline_revision) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [document.rows[0].id, versionNumber.rows[0].next, input.checksum, input.mimeType, input.originalName, input.storageKey, input.pipelineRevision]);
      const job = await client.query<{ id: string }>('INSERT INTO ingestion_jobs(version_id) VALUES($1) RETURNING id', [version.rows[0].id]);
      return { documentId: document.rows[0].id, versionId: version.rows[0].id, jobId: job.rows[0].id, duplicate: false };
    });
  }
  async list(): Promise<DocumentSummary[]> {
    const result = await this.db.query<{ id:string;title:string;visibility:Visibility;current_version_id:string|null;version_number:number|null;status:string|null;progress:number|null;warnings:unknown;created_at:Date }>(`
      SELECT d.id,d.title,d.visibility,v.id current_version_id,v.version_number,v.status,
        j.progress,v.warnings,d.created_at
      FROM documents d
      LEFT JOIN LATERAL (
        SELECT * FROM document_versions
        WHERE document_id=d.id
        ORDER BY created_at DESC
        LIMIT 1
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT progress FROM ingestion_jobs
        WHERE version_id=v.id
        ORDER BY created_at DESC
        LIMIT 1
      ) j ON true
      ORDER BY d.created_at DESC`);
    return result.rows.map((r) => ({
      id:r.id,title:r.title,visibility:r.visibility,currentVersionId:r.current_version_id??undefined,
      versionNumber:r.version_number??undefined,status:r.status??undefined,progress:r.progress??undefined,
      warnings:Array.isArray(r.warnings)?r.warnings as string[]:[],createdAt:r.created_at.toISOString(),
    }));
  }
  async loadProcessableVersion(versionId: string) {
    const result=await this.db.query<{ id:string;document_id:string;title:string;visibility:Visibility;storage_key:string;mime_type:string;original_name:string }>(`SELECT v.id,v.document_id,d.title,d.visibility,v.storage_key,v.mime_type,v.original_name FROM document_versions v JOIN documents d ON d.id=v.document_id WHERE v.id=$1`,[versionId]);
    const r=result.rows[0]; if(!r) throw new Error('Document version not found');
    return {id:r.id,documentId:r.document_id,title:r.title,visibility:r.visibility,storageKey:r.storage_key,mimeType:r.mime_type,originalName:r.original_name};
  }
  async completeProcessing(input: CompletedProcessing): Promise<void> {
    await this.db.transaction(async (client) => {
      const blockIds:string[]=[];
      for(const block of input.blocks){
        const result=await client.query<{id:string}>(`INSERT INTO canonical_blocks(version_id,block_order,type,text_content,page,section_path,source_start,source_end,confidence,warnings) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id`,[input.version.id,block.order,block.type,block.text,block.page??null,block.sectionPath,block.sourceStart??null,block.sourceEnd??null,block.confidence,JSON.stringify(block.warnings)]); blockIds.push(result.rows[0].id);
      }
      for(const [index,chunk] of input.chunks.entries()){
        await client.query(`INSERT INTO chunks(version_id,chunk_order,text_content,section_path,page,block_ids,visibility,embedding_model,embedding) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)`,[input.version.id,chunk.order,chunk.text,chunk.sectionPath,chunk.page??null,chunk.blockIndexes.map(i=>blockIds[i]),input.version.visibility,input.embeddingModel,vectorLiteral(input.embeddings[index])]);
      }
      await client.query(`UPDATE document_versions SET is_current=false,status=CASE WHEN status='ready' THEN 'superseded' ELSE status END WHERE document_id=$1 AND is_current`,[input.version.documentId]);
      await client.query(`UPDATE document_versions SET is_current=true,status='ready',warnings=$2::jsonb WHERE id=$1`,[input.version.id,JSON.stringify(input.warnings)]);
      await client.query(`UPDATE ingestion_jobs SET status='completed',progress=100,last_error=NULL,updated_at=now() WHERE id=$1`,[input.jobId]);
    });
  }
  async markEnqueueFailed(jobId: string, message: string): Promise<void> {
    await this.db.transaction(async (client) => {
      const job = await client.query<{ version_id: string }>(
        `UPDATE ingestion_jobs SET status='failed',last_error=$2,updated_at=now()
         WHERE id=$1 RETURNING version_id`,
        [jobId, message],
      );
      if (job.rows[0]) {
        await client.query(
          `UPDATE document_versions SET status='failed',warnings=$2::jsonb WHERE id=$1`,
          [job.rows[0].version_id, JSON.stringify([message])],
        );
      }
    });
  }
  async markProcessing(jobId: string, attempt: number): Promise<void> {
    await this.db.transaction(async (client) => {
      const job = await client.query<{ version_id: string }>(
        `UPDATE ingestion_jobs SET status='processing',attempts=$2,progress=0,last_error=NULL,updated_at=now()
         WHERE id=$1 RETURNING version_id`,
        [jobId, attempt],
      );
      if (!job.rows[0]) throw new Error('Ingestion job not found');
      await client.query(`UPDATE document_versions SET status='processing' WHERE id=$1`, [job.rows[0].version_id]);
    });
  }
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.db.query(
      `UPDATE ingestion_jobs SET progress=$2,updated_at=now() WHERE id=$1`,
      [jobId, Math.min(100, Math.max(0, Math.round(progress)))],
    );
  }
  async recordAttemptFailure(jobId: string, attempt: number, message: string, terminal: boolean): Promise<void> {
    await this.db.transaction(async (client) => {
      const job = await client.query<{ version_id: string }>(
        `UPDATE ingestion_jobs SET status=$2,attempts=$3,last_error=$4,updated_at=now()
         WHERE id=$1 RETURNING version_id`,
        [jobId, terminal ? 'failed' : 'queued', attempt, message],
      );
      if (job.rows[0]) {
        await client.query(
          `UPDATE document_versions SET status=$2,warnings=$3::jsonb WHERE id=$1`,
          [job.rows[0].version_id, terminal ? 'failed' : 'pending', JSON.stringify([message])],
        );
      }
    });
  }
  async search(queryEmbedding:number[],query:string,role:Visibility,limit:number):Promise<Evidence[]> {
    const result=await this.db.query<{id:string;document_id:string;version_id:string;title:string;text_content:string;page:number|null;section_path:string[];score:number}>(`WITH query_terms AS (
      SELECT to_tsquery('english',replace(plainto_tsquery('english',$2)::text,' & ',' | ')) value,
        tsvector_to_array(to_tsvector('english',$2)) terms
    ), eligible AS (
      SELECT c.*,v.document_id,d.title FROM chunks c JOIN document_versions v ON v.id=c.version_id JOIN documents d ON d.id=v.document_id WHERE v.is_current AND v.status='ready' AND (c.visibility='public' OR $3='staff')
    ), semantic AS (SELECT id,row_number() OVER(ORDER BY embedding <=> $1::vector) rank FROM eligible ORDER BY embedding <=> $1::vector LIMIT 20),
    lexical AS (
      SELECT id,row_number() OVER(ORDER BY matches DESC,lexical_score DESC) rank
      FROM (
        SELECT e.id,m.matches,ts_rank_cd(e.search_vector,q.value) lexical_score
        FROM eligible e CROSS JOIN query_terms q
        CROSS JOIN LATERAL (
          SELECT count(*)::int matches FROM unnest(q.terms) term
          WHERE e.search_vector @@ to_tsquery('english',term)
        ) m
        WHERE m.matches >= LEAST(2,cardinality(q.terms))
      ) candidates
      ORDER BY matches DESC,lexical_score DESC
      LIMIT 20
    ),
    ranked AS (SELECT id,SUM(score) score FROM (SELECT id,1.0/(60+rank) score FROM semantic UNION ALL SELECT id,2.0/(60+rank) score FROM lexical) x GROUP BY id ORDER BY score DESC LIMIT $4)
    SELECT e.id,e.document_id,e.version_id,e.title,e.text_content,e.page,e.section_path,
      GREATEST(1-(e.embedding <=> $1::vector),CASE WHEN e.id IN (SELECT id FROM lexical) THEN 0.5 ELSE 0 END) score
    FROM ranked r JOIN eligible e ON e.id=r.id
    WHERE 1-(e.embedding <=> $1::vector) >= 0.6 OR e.id IN (SELECT id FROM lexical)
    ORDER BY r.score DESC`,[vectorLiteral(queryEmbedding),query,role,limit]);
    return result.rows.map(r=>({evidenceId:r.id,chunkId:r.id,documentId:r.document_id,versionId:r.version_id,title:r.title,text:r.text_content,page:r.page??undefined,sectionPath:r.section_path,score:Number(r.score)}));
  }
  async getEvidence(id:string,role:Visibility):Promise<Evidence|null>{
    const result=await this.db.query<{id:string;document_id:string;version_id:string;title:string;text_content:string;page:number|null;section_path:string[]}>(`SELECT c.id,v.document_id,c.version_id,d.title,c.text_content,c.page,c.section_path FROM chunks c JOIN document_versions v ON v.id=c.version_id JOIN documents d ON d.id=v.document_id WHERE c.id=$1 AND v.is_current AND v.status='ready' AND (c.visibility='public' OR $2='staff')`,[id,role]);
    const r=result.rows[0]; return r?{evidenceId:r.id,chunkId:r.id,documentId:r.document_id,versionId:r.version_id,title:r.title,text:r.text_content,page:r.page??undefined,sectionPath:r.section_path,score:1}:null;
  }
  async record(input:Parameters<AnswerRunRepository['record']>[0]):Promise<void>{
    await this.db.query(`INSERT INTO answer_runs(message_id,role,question,pipeline_revision,model_profile,evidence_ids,tool_calls,outcome,duration_ms) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,[input.messageId,input.role,input.question,input.pipelineRevision,input.modelProfile,input.evidenceIds,JSON.stringify(input.toolCalls),input.outcome,input.durationMs]);
  }
}
