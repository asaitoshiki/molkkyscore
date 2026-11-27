import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.molmemo.app',
  appName: 'モルメモ',
  webDir: 'dist',
  android: {
    // 屋外で使うため、端末の暗いテーマに引きずられないようにする
    backgroundColor: '#fff8ec',
  },
}

export default config
