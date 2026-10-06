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
import { ExternalLink, RefreshCw, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ShopGood {
  id: number
  name: string
  price: string
  stock: number
  stock_str: string
  remark: string
  limit_quantity: number
}

interface TopupShopCardProps {
  topupLink?: string
}

/**
 * 兑换码商店卡片。
 *
 * 商品数据由服务端代取（/api/user/shop/goods）后用本站样式渲染，而不是
 * 用 iframe 内嵌商店页面：商店的商品列表依赖会话 Cookie，而该 Cookie 未
 * 声明 SameSite=None，跨站 iframe 中的请求不会携带，内嵌时商品区恒为空。
 */
export function TopupShopCard({ topupLink }: TopupShopCardProps) {
  const { t } = useTranslation()
  const [goods, setGoods] = useState<ShopGood[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGoods = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/user/shop/goods')
      const payload = res.data
      if (payload?.success) {
        setGoods(Array.isArray(payload.data) ? payload.data : [])
      } else {
        setError(payload?.message || t('Failed to load shop products'))
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        t('Failed to load shop products')
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (topupLink) {
      void loadGoods()
    }
  }, [topupLink, loadGoods])

  if (!topupLink) {
    return null
  }

  const openShop = () => window.open(topupLink, '_blank', 'noopener,noreferrer')

  return (
    <TitledCard
      title={t('Buy Redemption Code')}
      description={t('Complete the purchase below and redeem the code here.')}
      icon={<ShoppingCart className='h-4 w-4' />}
      iconTone='warning'
      disableHoverEffect
      action={
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => void loadGoods()}
            disabled={loading}
          >
            <RefreshCw
              className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')}
            />
            {t('Reload')}
          </Button>
          <Button variant='outline' size='sm' onClick={openShop}>
            {t('Open in new tab')}
            <ExternalLink className='ml-1.5 h-3.5 w-3.5' />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {['s1', 's2', 's3'].map((key) => (
            <Skeleton key={key} className='h-[104px] rounded-lg' />
          ))}
        </div>
      ) : error ? (
        <div className='text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm'>
          {error}
        </div>
      ) : goods.length === 0 ? (
        <div className='text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm'>
          {t('No products available')}
        </div>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {goods.map((item) => (
            <button
              key={item.id}
              type='button'
              onClick={openShop}
              className='hover:border-primary/60 hover:bg-accent/40 flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors'
            >
              <div className='flex items-start justify-between gap-2'>
                <span className='truncate text-sm font-medium'>{item.name}</span>
                <span className='text-primary shrink-0 font-mono text-sm font-semibold'>
                  ¥{item.price}
                </span>
              </div>
              <div className='text-muted-foreground text-xs'>
                {item.stock_str || `${t('Stock')}: ${item.stock}`}
              </div>
              {item.remark && (
                <p className='text-muted-foreground line-clamp-2 text-xs'>
                  {item.remark}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </TitledCard>
  )
}
