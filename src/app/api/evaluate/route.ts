import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { flowJson } = await req.json();

    if (!flowJson) {
      return Response.json({ success: false, error: "No flow JSON provided" }, { status: 400 });
    }

    // Write the JSON to a temporary file
    const tmpDir = os.tmpdir();
    const flowId = `flow-${Date.now()}`;
    const flowFilePath = path.join(tmpDir, `${flowId}.json`);

    await fs.writeFile(flowFilePath, JSON.stringify(flowJson, null, 2));

    // Execute the flow using n8n docker container
    // We mount the temp file into the container and execute it.
    // The execution might fail if nodes need specific credentials, but it will check the basic structure.

    const dockerCmd = `docker run --rm -v ${flowFilePath}:/tmp/flow.json n8nio/n8n n8n execute --file /tmp/flow.json`;

    let resultOutput = "";
    let success = true;

    try {
      const { stdout, stderr } = await execAsync(dockerCmd, { timeout: 30000 }); // 30s timeout
      resultOutput = stdout + (stderr ? `\nErrors:\n${stderr}` : '');
    } catch (execError: any) {
      success = false;
      resultOutput = execError.stdout + '\n' + execError.stderr + '\n' + execError.message;
    }

    // Clean up temp file
    try {
      await fs.unlink(flowFilePath);
    } catch (e) {
      console.error("Failed to delete tmp flow file", e);
    }

    return Response.json({
      success,
      output: resultOutput
    });

  } catch (error: any) {
    console.error("Evaluation error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
