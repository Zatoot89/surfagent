import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export function detectOS(platform = process.platform) {
    if (platform === 'darwin')
        return 'mac';
    if (platform === 'win32')
        return 'windows';
    return 'linux';
}
export function getBrowserPaths(platform = process.platform, env = process.env) {
    const programFiles = env.ProgramW6432 || env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = env.LOCALAPPDATA;
    const paths = {
        mac: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        ],
        linux: [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
            '/usr/bin/microsoft-edge',
            '/usr/bin/brave-browser',
        ],
        windows: [
            path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            ...(localAppData ? [path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
            path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            ...(localAppData ? [path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe')] : []),
            path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
            path.join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
            ...(localAppData ? [path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')] : []),
        ],
    };
    return paths[detectOS(platform)];
}
export function getChromePath(platform = process.platform, env = process.env) {
    if (env.BROWSER_PATH) {
        if (fs.existsSync(env.BROWSER_PATH))
            return env.BROWSER_PATH;
        console.error(`[surfagent] BROWSER_PATH set but not found: ${env.BROWSER_PATH}`);
        return null;
    }
    return getBrowserPaths(platform, env).find(browserPath => fs.existsSync(browserPath)) || null;
}
export function getUserDataDir(env = process.env, temporaryDirectory = os.tmpdir()) {
    return env.CHROME_USER_DATA_DIR || path.join(temporaryDirectory, 'surfagent-chrome');
}
export function getDefaultChromeProfile(platform = process.platform, env = process.env) {
    const home = env.HOME || env.USERPROFILE;
    if (detectOS(platform) === 'mac' && home) {
        return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'Default');
    }
    if (detectOS(platform) === 'linux' && home) {
        return path.join(home, '.config', 'google-chrome', 'Default');
    }
    if (detectOS(platform) === 'windows' && env.LOCALAPPDATA) {
        return path.join(env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default');
    }
    return null;
}
function copyIfMissing(source, destination) {
    if (fs.existsSync(source) && !fs.existsSync(destination)) {
        fs.copyFileSync(source, destination);
    }
}
export function prepareUserDataDir(userDataDir, profileDir) {
    const destinationProfile = path.join(userDataDir, 'Default');
    fs.mkdirSync(destinationProfile, { recursive: true });
    if (!profileDir)
        return;
    try {
        copyIfMissing(path.join(profileDir, 'Cookies'), path.join(destinationProfile, 'Cookies'));
        copyIfMissing(path.join(path.dirname(profileDir), 'Local State'), path.join(userDataDir, 'Local State'));
    }
    catch {
        // Chrome can lock its profile database; starting with a clean profile is still valid.
    }
}
