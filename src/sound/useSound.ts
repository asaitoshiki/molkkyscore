import { useAppStore } from '../store/useAppStore'
import { playSound } from './sfx'
import type { SoundName } from './sfx'

/** 設定で効果音を切っていれば鳴らさない */
export const useSound = () => {
  const soundOn = useAppStore((state) => state.soundOn)
  return (name: SoundName) => {
    if (soundOn) playSound(name)
  }
}
