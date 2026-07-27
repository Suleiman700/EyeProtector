import type { EyeProtectorApi } from './index'

declare global {
  interface Window {
    eyeprotector: EyeProtectorApi
  }
}
