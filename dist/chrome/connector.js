import CDP from 'chrome-remote-interface';
import process from 'node:process';
const DEFAULT_PORT = 9222;
const DEFAULT_HOST = 'localhost';
export async function listTargets(port = DEFAULT_PORT, host = DEFAULT_HOST) {
    try {
        const targets = await CDP.List({ port, host });
        return targets.filter((t) => t.type === 'page');
    }
    catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error(`Cannot connect to Chrome. Make sure Chrome is running with --remote-debugging-port=${port}\n` +
                `Start Chrome with: ${process.platform === 'win32' ? 'chrome.exe' : 'google-chrome'} --remote-debugging-port=${port}`);
        }
        throw error;
    }
}
export async function connectToTab(targetId, port = DEFAULT_PORT, host = DEFAULT_HOST) {
    const client = await CDP({ target: targetId, port, host });
    await client.Page.enable();
    await client.Runtime.enable();
    await client.DOM.enable();
    return client;
}
export async function connectToFirstTab(port = DEFAULT_PORT, host = DEFAULT_HOST) {
    const targets = await listTargets(port, host);
    if (targets.length === 0) {
        throw new Error('No browser tabs found');
    }
    const target = targets[0];
    const client = await connectToTab(target.id, port, host);
    return { client, target };
}
