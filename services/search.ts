import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativeSearchPlugin {
  show(): Promise<void>;
  hide(): Promise<void>;
  focus(): Promise<void>;
  blur(): Promise<void>;
  addListener(eventName: 'onSearchInput', listenerFunc: (data: { value: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'onSearchSubmit', listenerFunc: (data: { value: string }) => void): Promise<PluginListenerHandle>;
}

export const NativeSearch = registerPlugin<NativeSearchPlugin>('NativeSearch', {
  web: {
    show: async () => { console.log('NativeSearch: show (web)'); },
    hide: async () => { console.log('NativeSearch: hide (web)'); },
    focus: async () => { console.log('NativeSearch: focus (web)'); },
    blur: async () => { console.log('NativeSearch: blur (web)'); },
    addListener: async () => { return { remove: async () => {} } as any; },
  }
});