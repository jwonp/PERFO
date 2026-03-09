import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Platform info
    platform: process.platform,

    // Add more APIs as needed
    // example: sendMessage: (channel, data) => ipcRenderer.send(channel, data),
});

// Type definitions for the exposed API
declare global {
    interface Window {
        electronAPI: {
            getAppVersion: () => Promise<string>;
            platform: string;
        };
    }
}
