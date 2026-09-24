import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { detectOS, getBrowserPaths, getDefaultChromeProfile, getUserDataDir, prepareUserDataDir } from './platform.js';
test('identifies supported operating systems', () => {
    assert.equal(detectOS('darwin'), 'mac');
    assert.equal(detectOS('linux'), 'linux');
    assert.equal(detectOS('win32'), 'windows');
});
test('lists common Windows Chromium locations', () => {
    const localAppData = 'C:\\Users\\Agent\\AppData\\Local';
    const paths = getBrowserPaths('win32', {
        ProgramFiles: 'C:\\Program Files',
        ProgramW6432: 'D:\\Applications',
        'ProgramFiles(x86)': 'C:\\Program Files (x86)',
        LOCALAPPDATA: localAppData,
    });
    assert(paths.includes(path.join('D:\\Applications', 'Google', 'Chrome', 'Application', 'chrome.exe')));
    assert(paths.includes(path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe')));
    assert(paths.includes(path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')));
    assert.equal(getDefaultChromeProfile('win32', { LOCALAPPDATA: localAppData }), path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default'));
});
test('prepares a portable user-data directory without overwriting existing cookies', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'surfagent-test-'));
    const sourceProfile = path.join(temporaryDirectory, 'source', 'Default');
    const targetProfile = path.join(temporaryDirectory, 'target');
    fs.mkdirSync(sourceProfile, { recursive: true });
    fs.writeFileSync(path.join(sourceProfile, 'Cookies'), 'source cookies');
    fs.writeFileSync(path.join(path.dirname(sourceProfile), 'Local State'), 'source state');
    prepareUserDataDir(targetProfile, sourceProfile);
    assert.equal(fs.readFileSync(path.join(targetProfile, 'Default', 'Cookies'), 'utf8'), 'source cookies');
    assert.equal(fs.readFileSync(path.join(targetProfile, 'Local State'), 'utf8'), 'source state');
    fs.writeFileSync(path.join(targetProfile, 'Default', 'Cookies'), 'existing cookies');
    prepareUserDataDir(targetProfile, sourceProfile);
    assert.equal(fs.readFileSync(path.join(targetProfile, 'Default', 'Cookies'), 'utf8'), 'existing cookies');
    assert.equal(getUserDataDir({ CHROME_USER_DATA_DIR: 'custom-profile' }, temporaryDirectory), 'custom-profile');
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});
