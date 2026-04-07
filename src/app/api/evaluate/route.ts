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
    } catch (execError: unknown) {
      success = false;
      if (typeof execError === 'object' && execError !== null) {
        const e = execError as { stdout?: string; stderr?: string; message?: string };
        resultOutput = (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + (e.message || '');
      } else {
        resultOutput = String(execError);
      }
    }

    // Clean up temp file
    try {
      await fs.unlink(flowFilePath);
    } catch (e: unknown) {
      console.error("Failed to delete tmp flow file", e);
    }

    return Response.json({
      success,
      output: resultOutput
    });

  } catch (error: unknown) {
    console.error("Evaluation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
