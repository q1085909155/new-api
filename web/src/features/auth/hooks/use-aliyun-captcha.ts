import i18next from 'i18next'
import { useState } from 'react'
import { toast } from 'sonner'

import { useStatus } from '@/hooks/use-status'

/**
 * Hook for managing Aliyun Captcha verification
 */
export function useAliyunCaptcha(sceneType: 'login' | 'register' = 'login') {
  const { status } = useStatus()
  const [aliyunCaptchaToken, setAliyunCaptchaToken] = useState('')

  const aliyunPrefix = status?.aliyun_captcha_prefix || ''
  const aliyunRegion = status?.aliyun_captcha_region || 'cn'

  let targetSceneId = status?.aliyun_captcha_scene_id || ''
  if (sceneType === 'login' && status?.aliyun_captcha_login_scene_id) {
    targetSceneId = status.aliyun_captcha_login_scene_id
  } else if (sceneType === 'register' && status?.aliyun_captcha_register_scene_id) {
    targetSceneId = status.aliyun_captcha_register_scene_id
  }

  const isAliyunCaptchaEnabled = !!(status?.aliyun_captcha_check && targetSceneId)
  const aliyunSceneId = targetSceneId

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
    aliyunPrefix,
    aliyunCaptchaToken,
    setAliyunCaptchaToken,
    validateAliyunCaptcha,
  }
}
