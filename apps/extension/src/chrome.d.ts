interface GlyphLogChromeRuntimeResponse {
  device_token?: string;
  [key: string]: unknown;
}

interface GlyphLogChromeSender {
  tab?: {
    url?: string;
  };
}

interface GlyphLogChromeRuntime {
  lastError?: {
    message: string;
  };
  sendMessage(
    message: unknown,
    callback: (response?: GlyphLogChromeRuntimeResponse) => void
  ): void;
  onInstalled: {
    addListener(callback: () => void): void;
  };
  onMessage: {
    addListener(
      callback: (
        message: Record<string, unknown>,
        sender: GlyphLogChromeSender,
        sendResponse: (response: Record<string, unknown>) => void
      ) => boolean | void
    ): void;
  };
}

interface GlyphLogChromeStorageArea {
  get(
    keys: string[] | null,
    callback: (result: Record<string, string | undefined>) => void
  ): void;
  set(data: Record<string, unknown>, callback: () => void): void;
  remove(keys: string[], callback: () => void): void;
}

declare const chrome: {
  runtime: GlyphLogChromeRuntime;
  storage: {
    local: GlyphLogChromeStorageArea;
  };
};
