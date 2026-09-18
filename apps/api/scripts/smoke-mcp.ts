import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL(process.env.MCP_URL ?? 'http://127.0.0.1:3001/mcp'),
  {
    requestInit: {
      headers: {
        authorization: `Bearer ${process.env.MCP_TOKEN ?? 'local-demo-token'}`,
        'x-demo-role': 'public',
      },
    },
  },
);
const client = new Client({ name: 'demo-smoke-test', version: '1.0.0' });
await client.connect(transport);
const tools = await client.listTools();
if (!tools.tools.some((tool) => tool.name === 'search_knowledge')) {
  throw new Error('search_knowledge was not advertised');
}
const result = await client.callTool({
  name: 'search_knowledge',
  arguments: { query: 'How long does a device request take?' },
});
console.log(JSON.stringify({ tools: tools.tools.map((tool) => tool.name), result }));
await client.close();
