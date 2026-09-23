import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { AccessToken } from 'livekit-server-sdk';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiKey = env.LIVEKIT_API_KEY || 'APIgfDf6krFFzKK';
  const apiSecret = env.LIVEKIT_API_SECRET || 'bUHRtdSsNOGGOGQLvb7oLF48U00mc0ViQNazPlqqTTC';

  return {
    plugins: [
      react(),
      {
        name: 'livekit-auto-token-endpoint',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/token')) {
              try {
                const url = new URL(req.url, 'http://localhost');
                const room = url.searchParams.get('room') || 'default-room';
                const identity = url.searchParams.get('identity') || 'user-' + Math.floor(Math.random() * 10000);
                const name = url.searchParams.get('name') || identity;

                const at = new AccessToken(apiKey, apiSecret, {
                  identity,
                  name,
                  ttl: '4h',
                });

                at.addGrant({
                  roomJoin: true,
                  room,
                  canPublish: true,
                  canSubscribe: true,
                  canPublishData: true,
                });

                const token = await at.toJwt();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ token }));
                return;
              } catch (err: any) {
                console.error('Auto token generation error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Token creation failed' }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
  };
});
