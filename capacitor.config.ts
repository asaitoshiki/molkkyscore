import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.asaitoshiki.molkkyscore',
  appName: 'モルックノート',
  webDir: 'dist',
  android: {
    // 屋外で使うため、端末の暗いテーマに引きずられないようにする
    backgroundColor: '#f3f4f1',
  },
}

export default config
