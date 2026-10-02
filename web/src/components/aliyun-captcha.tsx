import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    initAliyunCaptcha?: (options: Record<string, unknown>) => void
    AliyunCaptchaConfig?: Record<string, unknown>
  }
}

interface AliyunCaptchaProps {
  sceneId: string
  region?: string
  onVerify: (token: string) => void
  className?: string
}

export function AliyunCaptcha({
  sceneId,
  region = 'cn',
  onVerify,
  className,
}: AliyunCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!sceneId) return

    window.AliyunCaptchaConfig = {
      region: region || 'cn',
      prefix: '',
    }

    const init = () => {
      if (!window.initAliyunCaptcha || !containerRef.current) return
      try {
        window.initAliyunCaptcha({
          SceneId: sceneId,
          mode: 'embed',
          element: containerRef.current,
          success: (token: string) => {
            onVerify(token)
          },
          fail: (err: unknown) => {
            console.error('Aliyun Captcha failed', err)
          },
          slideStyle: {
            width: 320,
            height: 40,
          },
        })
      } catch (e) {
        console.error('initAliyunCaptcha error:', e)
      }
    }

    if (window.initAliyunCaptcha) {
      init()
      return
    }

    const scriptId = 'aliyun-captcha-sdk'
    if (document.getElementById(scriptId)) return
    const s = document.createElement('script')
    s.id = scriptId
    s.src = 'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'
    s.async = true
    s.defer = true
    s.onload = () => init()
    document.head.appendChild(s)
  }, [sceneId, region, onVerify])

  return (
    <div className={className}>
      <div ref={containerRef} id='aliyun-captcha-element' />
    </div>
  )
}
