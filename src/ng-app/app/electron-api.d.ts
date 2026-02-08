export interface ElectronAPI {
    ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
        addListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
        once: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        sendSync: (channel: string, ...args: any[]) => any;
        removeListener: (channel: string, listener: any) => void;
        off: (channel: string, listener: any) => void;
        removeAllListeners: (channel: string) => void;
    };
    shell: {
        openExternal: (url: string) => Promise<void>;
    };
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
