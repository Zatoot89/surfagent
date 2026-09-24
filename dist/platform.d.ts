export type SupportedOS = 'mac' | 'linux' | 'windows';
export declare function detectOS(platform?: NodeJS.Platform): SupportedOS;
export declare function getBrowserPaths(platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv): string[];
export declare function getChromePath(platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv): string | null;
export declare function getUserDataDir(env?: NodeJS.ProcessEnv, temporaryDirectory?: string): string;
export declare function getDefaultChromeProfile(platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv): string | null;
export declare function prepareUserDataDir(userDataDir: string, profileDir: string | null): void;
