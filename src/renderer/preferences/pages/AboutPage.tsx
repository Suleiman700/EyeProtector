import { useEffect, useState } from 'react'
import { COLORS } from '../components/controls'
import type { UpdateInfo } from '../../../shared/ipc'

function updateLabel(u: UpdateInfo): string {
  switch (u.status) {
    case 'checking':
      return 'Checking…'
    case 'available':
      return `Version ${u.version} available`
    case 'up-to-date':
      return "You're up to date"
    case 'error':
      return "Couldn't check — try again"
    default:
      return 'Check for updates'
  }
}

export function AboutPage(): JSX.Element {
  const [version, setVersion] = useState('')
  const [update, setUpdate] = useState<UpdateInfo>({ status: 'idle' })

  useEffect(() => {
    window.eyeprotector.getAppInfo().then((info) => setVersion(info.version))
    window.eyeprotector.getUpdate().then(setUpdate)
    return window.eyeprotector.onUpdateChange(setUpdate)
  }, [])

  const check = (): void => {
    window.eyeprotector.checkUpdate().then(setUpdate)
  }

  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <div
        className="flex h-[88px] w-[88px] items-center justify-center rounded-[22px]"
        style={{
          backgroundImage: 'linear-gradient(135deg, #22D3EE 0%, #60A5FA 50%, #A78BFA 100%)',
          boxShadow: '0 6px 18px rgba(96,165,250,0.35)'
        }}
      >
        <svg width="46" height="46" viewBox="0 0 40 40" fill="none">
          <path
            d="M5 20s5.5-9 15-9 15 9 15 9-5.5 9-15 9-15-9-15-9z"
            stroke="#fff"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="20" r="5" fill="#fff" />
        </svg>
      </div>
      <h2 className="mt-5 text-[20px] font-bold" style={{ color: COLORS.text }}>
        EyeProtector
      </h2>
      <p className="mt-1 text-[13px]" style={{ color: COLORS.secondary }}>
        {version ? `Version ${version}` : ' '}
      </p>
      <p className="mt-4 max-w-[300px] text-[13px] leading-relaxed" style={{ color: COLORS.secondary }}>
        Gentle blink reminders and screen breaks that keep your eyes healthy while you work.
      </p>
      <div className="mt-7 flex items-center gap-2">
        <button
          className="ios-filled-btn rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-60"
          style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.accent }}
          disabled={update.status === 'checking'}
          onClick={check}
        >
          {updateLabel(update)}
        </button>
        {update.status === 'available' && update.url && (
          <button
            className="ios-filled-btn rounded-lg px-4 py-2 text-[13px] font-medium text-white"
            style={{ backgroundColor: COLORS.accent }}
            onClick={() => window.eyeprotector.openUpdatePage(update.url!)}
          >
            Download
          </button>
        )}
      </div>

      <button
        className="ios-filled-btn mt-8 rounded-lg px-5 py-2 text-[13px] font-medium"
        style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: '#FF3B30' }}
        onClick={() => window.eyeprotector.quitApp()}
      >
        Quit EyeProtector
      </button>
    </div>
  )
}
