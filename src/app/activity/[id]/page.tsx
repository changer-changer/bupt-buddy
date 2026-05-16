'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Navbar from '@/components/navbar'

interface Registration {
  id: string
  userId: string
  contactWechat: string | null
  contactPhone: string | null
  user: { id: string; nickname: string | null }
}

interface ActivityDetail {
  id: string
  title: string
  location: string
  meetupPoint: string
  eventTime: string
  maxParticipants: number
  status: string
  description: string | null
  creator: { id: string; nickname: string | null; email: string }
  registrations: Registration[]
  isCreator: boolean
  isAdmin: boolean
  hasJoined: boolean
  isEnded: boolean
}

export default function ActivityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [contactWechat, setContactWechat] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setActivity(data.activity)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('加载失败')
        setLoading(false)
      })
  }, [id])

  const handleJoin = async () => {
    if (!contactWechat && !contactPhone) {
      setError('请至少填写一种联系方式')
      return
    }
    setJoinLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/activities/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactWechat, contactPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '报名失败')
      } else {
        setShowJoinForm(false)
        router.refresh()
        window.location.reload()
      }
    } catch {
      setError('网络错误')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleReport = async () => {
    if (!reportReason.trim()) {
      setError('请填写举报原因')
      return
    }
    setReportLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/activities/${id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '举报失败')
      } else {
        setShowReportForm(false)
        setReportReason('')
        alert('举报成功，感谢你的反馈')
      }
    } catch {
      setError('网络错误')
    } finally {
      setReportLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要取消这个活动吗？')) return
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('取消失败')
      }
    } catch {
      setError('网络错误')
    }
  }

  if (loading) return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 text-center text-gray-400">
        加载中...
      </main>
    </>
  )

  if (error && !activity) return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 text-center text-red-500">
        {error}
      </main>
    </>
  )

  if (!activity) return null

  const eventTime = new Date(activity.eventTime)
  const isFull = activity.status === 'FULL'
  const canJoin = !activity.isCreator && !activity.hasJoined && !isFull && !activity.isEnded

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-lg font-bold">{activity.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activity.status === 'ACTIVE' ? 'bg-green-50 text-green-600' :
              activity.status === 'FULL' ? 'bg-orange-50 text-orange-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {activity.status === 'ACTIVE' ? '报名中' :
               activity.status === 'FULL' ? '已满' :
               activity.status === 'ENDED' ? '已结束' :
               activity.status === 'CANCELLED' ? '已取消' : '已隐藏'}
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>📍 地点：{activity.location}</p>
            <p>📌 集合点：{activity.meetupPoint}</p>
            <p>🕐 时间：{format(eventTime, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}</p>
            <p>👥 人数：{activity.registrations.length}/{activity.maxParticipants}</p>
            {activity.description && (
              <p className="text-gray-500 pt-1">📝 {activity.description}</p>
            )}
          </div>

          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            发起人：{activity.creator.nickname || activity.creator.email.split('@')[0]}
          </div>

          {activity.isCreator && activity.registrations.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-sm font-medium mb-2">报名成员</h3>
              <div className="space-y-2">
                {activity.registrations.map((r) => (
                  <div key={r.id} className="text-sm bg-gray-50 rounded-lg p-3">
                    <p className="font-medium">
                      {r.user.nickname || '未设置昵称'}
                    </p>
                    <div className="text-gray-500 text-xs mt-1 space-y-0.5">
                      {r.contactWechat && <p>微信：{r.contactWechat}</p>}
                      {r.contactPhone && <p>电话：{r.contactPhone}</p>}
                      {!r.contactWechat && !r.contactPhone && <p>未留联系方式</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!activity.isCreator && activity.hasJoined && (
            <div className="pt-2 border-t border-gray-100">
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                ✅ 你已报名成功！发起人联系方式将在报名列表中可见。
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {canJoin && !showJoinForm && (
              <button
                onClick={() => setShowJoinForm(true)}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                立即加入
              </button>
            )}
            {activity.isCreator && !activity.isEnded && (
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100"
              >
                取消活动
              </button>
            )}
            {!activity.isCreator && !showReportForm && (
              <button
                onClick={() => setShowReportForm(true)}
                className="px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
              >
                举报
              </button>
            )}
          </div>

          {showJoinForm && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium">填写联系方式</p>
              <input
                type="text"
                placeholder="微信号"
                value={contactWechat}
                onChange={(e) => setContactWechat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="手机号（可选）"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoin}
                  disabled={joinLoading}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {joinLoading ? '提交中...' : '确认报名'}
                </button>
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {showReportForm && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium">举报原因</p>
              <textarea
                placeholder="请简要说明举报原因..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {reportLoading ? '提交中...' : '提交举报'}
                </button>
                <button
                  onClick={() => setShowReportForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
