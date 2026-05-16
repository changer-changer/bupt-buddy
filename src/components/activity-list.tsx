'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Activity {
  id: string
  title: string
  location: string
  eventTime: string
  maxParticipants: number
  status: string
  _count: { registrations: number }
  creator: { nickname: string | null; email: string }
}

export default function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const loadActivities = useCallback(() => {
    fetch('/api/activities')
      .then((r) => r.json())
      .then((data) => {
        setActivities(data.activities || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadActivities()

    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource('/api/sse')
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'heartbeat') {
            loadActivities()
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // SSE not supported, fall back to manual refresh
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [loadActivities])

  if (loading) return <div className="text-center py-8 text-gray-400">加载中...</div>

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
        <p className="text-gray-400">暂无活动</p>
        <p className="text-sm text-gray-300 mt-1">成为第一个发起人吧</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((a) => (
        <Link
          key={a.id}
          href={`/activity/${a.id}`}
          className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-gray-900">{a.title}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                a.status === 'FULL'
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              {a.status === 'FULL' ? '已满' : '报名中'}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-500 space-y-1">
            <p>📍 {a.location}</p>
            <p>🕐 {format(new Date(a.eventTime), 'MM月dd日 HH:mm', { locale: zhCN })}</p>
            <p>
              👥 {a._count.registrations}/{a.maxParticipants} 人
            </p>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            发起人：{a.creator.nickname || a.creator.email.split('@')[0]}
          </div>
        </Link>
      ))}
    </div>
  )
}
