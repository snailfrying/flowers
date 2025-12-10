// Load environment variables from env.yaml file
// In browsers/extension service workers, this is a no-op.

let envConfig: Record<string, string> = {};

/**
 * Load env.yaml file (actually .env format: key=value)
 * This should be called during initialization in Node.js environment
 */
export async function loadEnvYaml(): Promise<void> {
  try {
    const g: any = (typeof globalThis !== 'undefined') ? (globalThis as any) : undefined;
    if (!g?.process) return; // Not in Node.js environment
    
    const fs = (Function('return require') as any)('fs');
    const path = (Function('return require') as any)('path');
    
    // Try to read env.yaml file
    const envYamlPath = path.join((g.process as any).cwd(), 'env.yaml');
    if (fs.existsSync(envYamlPath)) {
      const content = fs.readFileSync(envYamlPath, 'utf-8');
      // Parse key=value format
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim();
            const value = trimmed.substring(equalIndex + 1).trim();
            if (key && value) {
              envConfig[key] = value;
            }
          }
        }
      }
      console.info('[Env] Loaded env.yaml with', Object.keys(envConfig).length, 'keys');
    } else {
      console.warn('[Env] env.yaml file not found at:', envYamlPath);
    }
  } catch (error: any) {
    console.error('[Env] Failed to load env.yaml:', error?.message || error);
  }
}

export function loadEnvSync(): void {
  // Keep for backward compatibility, but load from env.yaml instead
  loadEnvYaml().catch(() => {});
}

export async function loadEnv(): Promise<void> {
  await loadEnvYaml();
}

/**
 * Get environment variable value
 * First checks process.env, then checks env.yaml config
 * If required=true and value is missing, throws error
 */
export function envGet(key: string, required = false): string {
  // First check process.env (for Node.js environment)
  const g: any = (typeof globalThis !== 'undefined') ? (globalThis as any) : undefined;
  let val = g?.process?.env?.[key];
  
  // If not in process.env, check env.yaml config
  if (!val || val === '') {
    val = envConfig[key];
  }
  
  // If required and still no value, throw error
  if (required && (!val || val.trim() === '')) {
    throw new Error(`Required environment variable "${key}" is not configured. Please set it in env.yaml or environment variables.`);
  }
  
  return val || '';
}

export function getProviderCredentials(provider: string): { baseUrl?: string; apiKey?: string } {
  switch (provider) {
    case 'openrouter':
      return {
        baseUrl: envGet('OPENROUTER_BASE_URL', false),
        apiKey: envGet('OPENROUTER_API_KEY', false)
      };
    case 'deepseek':
      return {
        baseUrl: envGet('DEEPSEEK_BASE_URL', false),
        apiKey: envGet('DEEPSEEK_API_KEY', false)
      };
    case 'dashscope':
      return {
        baseUrl: envGet('DASHSCOPE_BASE_URL', false),
        apiKey: envGet('DASHSCOPE_API_KEY', false)
      };
    case 'zhipu':
      return {
        baseUrl: envGet('ZHIPU_BASE_URL', false),
        apiKey: envGet('ZHIPU_API_KEY', false)
      };
    case 'chatglm':
      return {
        baseUrl: envGet('CHATGLM_BASE_URL', false),
        apiKey: envGet('CHATGLM_API_KEY', false)
      };
    case 'anthropic':
      return {
        baseUrl: envGet('ANTHROPIC_BASE_URL', false),
        apiKey: envGet('ANTHROPIC_API_KEY', false)
      };
    case 'google':
      return {
        baseUrl: envGet('GOOGLE_GENAI_BASE_URL', false),
        apiKey: envGet('GOOGLE_API_KEY', false)
      };
    default:
      return {};
  }
}

