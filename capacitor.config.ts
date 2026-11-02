import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.asaitoshiki.molkkyscore',
  appName: 'モルメモ',
  webDir: 'dist',
  android: {
    // 屋外で使うため、端末の暗いテーマに引きずられないようにする
    backgroundColor: '#fff8ec',
  },
}

export default config
