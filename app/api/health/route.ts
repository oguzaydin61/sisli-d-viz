import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Teşhis endpoint'i: hangi ortam değişkenlerinin görünür olduğunu raporlar.
 * Gizli değerleri ASLA döndürmez, sadece var/yok bilgisini verir.
 * Canlıda kontrol: https://<site>/api/health
 */
export async function GET() {
  const hasKvUrl = Boolean(process.env.KV_REST_API_URL);
  const hasKvToken = Boolean(process.env.KV_REST_API_TOKEN);
  const hasUpstashUrl = Boolean(process.env.UPSTASH_REDIS_REST_URL);
  const hasUpstashToken = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

  const remoteConfigured = (hasKvUrl && hasKvToken) || (hasUpstashUrl && hasUpstashToken);

  return NextResponse.json({
    vercel: Boolean(process.env.VERCEL),
    remoteConfigured,
    storage: remoteConfigured ? 'redis' : 'local-file',
    env: {
      KV_REST_API_URL: hasKvUrl ? 'SET' : 'MISSING',
      KV_REST_API_TOKEN: hasKvToken ? 'SET' : 'MISSING',
      UPSTASH_REDIS_REST_URL: hasUpstashUrl ? 'SET' : 'MISSING',
      UPSTASH_REDIS_REST_TOKEN: hasUpstashToken ? 'SET' : 'MISSING'
    },
    hint: remoteConfigured
      ? 'Redis yapılandırması tamam.'
      : 'Vercel > Storage > Upstash Redis oluşturup projeye bağlayın, sonra REDEPLOY edin.'
  });
}
