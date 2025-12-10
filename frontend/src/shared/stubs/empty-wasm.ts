// Stub module for 'hnswlib-wasm' to avoid loading WASM in MV3 Service Worker
// Provides a no-op export shape so dynamic import succeeds but yields no Index
// Consumers should detect missing Index and fall back gracefully.

export const Index = undefined as unknown as { new(...args: any[]): any };

export default { Index } as any;


