/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const botProtectionSchema = z.object({
  TurnstileCheckEnabled: z.boolean(),
  TurnstileSiteKey: z.string().optional(),
  TurnstileSecretKey: z.string().optional(),

  AliyunCaptchaCheckEnabled: z.boolean(),
  AliyunCaptchaSceneId: z.string().optional(),
  AliyunCaptchaAccessKeyId: z.string().optional(),
  AliyunCaptchaAccessKeySecret: z.string().optional(),
  AliyunCaptchaRegion: z.string().optional(),
})

type BotProtectionFormValues = z.infer<typeof botProtectionSchema>

type BotProtectionSectionProps = {
  defaultValues: BotProtectionFormValues
}

export function BotProtectionSection({
  defaultValues,
}: BotProtectionSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<BotProtectionFormValues>({
    resolver: zodResolver(botProtectionSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const onSubmit = async (data: BotProtectionFormValues) => {
    const updates = Object.entries(data).filter(
      ([key, value]) =>
        value !== defaultValues[key as keyof BotProtectionFormValues]
    )

    for (const [key, value] of updates) {
      await updateOption.mutateAsync({ key, value: String(value ?? '') })
    }
  }

  return (
    <SettingsSection title={t('Bot Protection')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
          />
          {/* Cloudflare Turnstile */}
          <div className='space-y-4'>
            <h4 className='text-sm font-semibold text-foreground/90'>{t('Cloudflare Turnstile')}</h4>
            <FormField
              control={form.control}
              name='TurnstileCheckEnabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable Turnstile')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Protect login and registration with Cloudflare Turnstile'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />

            <FormField
              control={form.control}
              name='TurnstileSiteKey'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Site Key')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('Your Turnstile site key')}
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='TurnstileSecretKey'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Secret Key')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={t('Your Turnstile secret key')}
                      autoComplete='new-password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='my-6 border-t border-border/60' />

          {/* 阿里云验证码 2.0 */}
          <div className='space-y-4'>
            <h4 className='text-sm font-semibold text-foreground/90'>{t('Aliyun Captcha', '阿里云验证码 2.0')}</h4>
            <FormField
              control={form.control}
              name='AliyunCaptchaCheckEnabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable Aliyun Captcha', '启用阿里云验证码')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Protect login and registration with Alibaba Cloud Captcha 2.0',
                        '使用阿里云验证码 2.0 防护注册与登录页面'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />

            <FormField
              control={form.control}
              name='AliyunCaptchaSceneId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Scene ID', '场景 ID (SceneId)')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('Your Aliyun Captcha SceneId', '阿里云控制台创建的验证场景 ID')}
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='AliyunCaptchaAccessKeyId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AccessKey ID', '阿里云 AccessKey ID')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('Your Aliyun AccessKey ID', '调用验签接口的 RAM 用户 AccessKey ID')}
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='AliyunCaptchaAccessKeySecret'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AccessKey Secret', '阿里云 AccessKey Secret')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={t('Your Aliyun AccessKey Secret', '阿里云 AccessKey Secret')}
                      autoComplete='new-password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='AliyunCaptchaRegion'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Region', '服务地域 (Region)')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('Default: cn (or sgp for Singapore)', '默认: cn (海外填 sgp)')}
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
