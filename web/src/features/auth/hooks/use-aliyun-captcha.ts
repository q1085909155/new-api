import i18next from 'i18next'
import { useState } from 'react'
import { toast } from 'sonner'

import { useStatus } from '@/hooks/use-status'

/**
 * Hook for managing Aliyun Captcha verification
 */
export function useAliyunCaptcha() {
  const { status } = useStatus()
  const [aliyunCaptchaToken, setAliyunCaptchaToken] = useState('')

  const isAliyunCaptchaEnabled = !!(
    status?.aliyun_captcha_check && status?.aliyun_captcha_scene_id
  )
  const aliyunSceneId = status?.aliyun_captcha_scene_id || ''
  const aliyunRegion = status?.aliyun_captcha_region || 'cn'

  const validateAliyunCaptcha = (): boolean => {
    if (isAliyunCaptchaEnabled && !aliyunCaptchaToken) {
      toast.info(
        i18next.t('Please complete the Aliyun Captcha verification', {
          defaultValue: '请完成阿里云验证码人机验证',
        })
      )
      return false
    }
    return true
  }

  return {
    isAliyunCaptchaEnabled,
    aliyunSceneId,
    aliyunRegion,
    aliyunCaptchaToken,
    setAliyunCaptchaToken,
    validateAliyunCaptcha,
  }
}
