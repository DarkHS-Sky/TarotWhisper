import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function GET() {
  let cfEnv: Record<string, unknown> = {}
  let cfError: string | null = null

  try {
    const { env } = getCloudflareContext()
    cfEnv = env as Record<string, unknown>
  } catch (e) {
    cfError = e instanceof Error ? e.message : String(e)
  }

  const envKeys = Object.keys(cfEnv)
  const hasDefaultLlm = {
    enabled: 'DEFAULT_LLM_ENABLED' in cfEnv,
    baseUrl: 'DEFAULT_LLM_BASE_URL' in cfEnv,
    apiKey: 'DEFAULT_LLM_API_KEY' in cfEnv,
    model: 'DEFAULT_LLM_MODEL' in cfEnv,
  }

  return Response.json({
    cfError,
    envKeysCount: envKeys.length,
    envKeys: envKeys.filter(k => k.startsWith('DEFAULT_') || k.startsWith('NEXT')),
    hasDefaultLlm,
    enabledValue: cfEnv.DEFAULT_LLM_ENABLED,
    processEnvKeys: Object.keys(process.env).filter(k => k.startsWith('DEFAULT_')),
  })
}
