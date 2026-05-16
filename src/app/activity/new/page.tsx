'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'

const PRESET_TITLES = ['吃饭', '健身', '打球', '自习', '逛北京', '看电影', '剧本杀', '其他']

export default function NewActivityPage() {
  const router = useRouter()

  const now = new Date()
  const defaultTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [meetupPoint, setMeetupPoint] = useState('')
  const [eventTime, setEventTime] = useState(defaultTime)
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!title || !location || !meetupPoint || !eventTime) {
      setError('请填写完整信息')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          location,
          meetupPoint,
          eventTime: new Date(eventTime).toISOString(),
          maxParticipants,
          description,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '创建失败')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <h1 className="text-lg font-bold mb-4">发起活动</h1>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">做什么</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_TITLES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTitle(t)}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    title === t
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="或自定义..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">去哪</label>
            <input
              type="text"
              placeholder="地点名称"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">集合点</label>
            <input
              type="text"
              placeholder="具体集合位置"
              value={meetupPoint}
              onChange={(e) => setMeetupPoint(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">时间</label>
            <input
              type="datetime-local"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">人数上限</label>
            <input
              type="number"
              min={2}
              max={50}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">补充说明（可选）</label>
            <textarea
              placeholder="有什么想补充的..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布活动'}
          </button>
        </div>
      </main>
    </>
  )
}
