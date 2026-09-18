import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
const roots=['apps/web/src','apps/api/src'];
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});const result=[];for(const entry of entries){const path=join(dir,entry.name);if(entry.isDirectory())result.push(...await files(path));else if(/\.(ts|tsx)$/.test(entry.name))result.push(path)}return result}
const violations=[];
for(const root of roots){for(const file of await files(root)){const text=await readFile(file,'utf8');const imports=[...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);const rel=relative(root,file);
if(root.includes('/web/')){if(rel.startsWith('app/')&&imports.some(i=>i.startsWith('@/domains/')))violations.push(`${rel}: app must compose features, not domains`);if(rel.startsWith('domains/')&&imports.some(i=>i.startsWith('@/features/')))violations.push(`${rel}: domains cannot import features`);if(rel.startsWith('core/')&&imports.some(i=>i.startsWith('@/domains/')||i.startsWith('@/features/')))violations.push(`${rel}: core imports upward`);}
else if(rel.startsWith('application/')&&imports.some(i=>i.includes('/infrastructure/')||i.includes('/presentation/')))violations.push(`${rel}: application imports an adapter`);
}}
if(violations.length){console.error(violations.join('\n'));process.exit(1)}console.log('Architecture boundaries passed');
