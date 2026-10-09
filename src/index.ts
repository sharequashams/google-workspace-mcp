import { runStdioServer } from './server/stdio.js';
import { runSseServer } from './server/sse.js';

const transport = process.env.MCP_TRANSPORT || 'stdio';

async function main() {
  if (transport === 'stdio') {
    await runStdioServer();
  } else if (transport === 'sse') {
    await runSseServer();
  } else {
    console.error(`Transport ${transport} is not yet implemented.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
