import { All, Controller, Headers, HttpStatus, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { AuthorizationPolicy } from '../../application/ports/authorization.port.js';
import { AUTHORIZATION_POLICY } from '../../application/ports/tokens.js';
import { GetSourceUseCase } from '../../application/use-cases/get-source.use-case.js';
import { SearchKnowledgeUseCase } from '../../application/use-cases/search-knowledge.use-case.js';
@Controller('mcp')
export class McpController {
  constructor(private readonly search:SearchKnowledgeUseCase,private readonly source:GetSourceUseCase,private readonly config:ConfigService,@Inject(AUTHORIZATION_POLICY)private readonly auth:AuthorizationPolicy){}
  @All() async handle(@Req()req:Request,@Res()res:Response,@Headers('authorization')authorization?:string,@Headers('origin')origin?:string,@Headers('x-demo-role')roleHeader?:string){
    const token=this.config.get('MCP_TOKEN','local-demo-token');
    if(authorization!==`Bearer ${token}`){res.status(HttpStatus.UNAUTHORIZED).json({error:'Unauthorized'});return;}
    const allowedOrigin=this.config.get('WEB_ORIGIN','http://localhost:3000');
    if(origin&&origin!==allowedOrigin){res.status(HttpStatus.FORBIDDEN).json({error:'Origin not allowed'});return;}
    const role=this.auth.roleFrom(roleHeader);const server=new McpServer({name:'document-knowledge',version:'1.0.0'});
    server.registerTool('search_knowledge',{description:'Search authorized current knowledge',inputSchema:{query:z.string().min(2).max(500)}},async({query})=>{const evidence=await this.search.execute(query,role,5);return{content:[{type:'text',text:JSON.stringify(evidence)}],structuredContent:{evidence}}});
    server.registerTool('get_source',{description:'Get an authorized source by evidence ID',inputSchema:{evidenceId:z.string().uuid()}},async({evidenceId})=>{const evidence=await this.source.execute(evidenceId,role);return evidence?{content:[{type:'text',text:JSON.stringify(evidence)}],structuredContent:{evidence}}:{isError:true,content:[{type:'text',text:'Source is unavailable'}]};});
    const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
    res.on('close',()=>{void transport.close();void server.close();});await server.connect(transport);await transport.handleRequest(req,res,req.body);
  }
}
