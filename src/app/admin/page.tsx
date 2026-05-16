'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Navbar from '@/components/navbar'

interface Activity {
  id: string
  title: string
  location: string
  status: string
  createdAt: string
  creator: { email: string; nickname: string | null }
  _count: { registrations: number; reports: number }
}

interface Report {
  id: string
  reason: string
  createdAt: string
  activity: { title: string; status: string }
  reporter: { email: string; nickname: string | null }
}

export default function AdminPage() {
  const router = useRouter()
interface PendingApproval {
  id: string
  email: string
  name: string | null
  studentId: string | null
  createdAt: string
}

  const [activities, setActivities] = useState<Activity[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [pending, setPending] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/activities').then((r) => r.json()),
      fetch('/api/admin/reports').then((r) => r.json()),
      fetch('/api/admin/pending').then((r) => r.json()),
    ])
      .then(([activitiesData, reportsData, pendingData]) => {
        if (activitiesData.error) {
          setError(activitiesData.error)
        } else {
          setActivities(activitiesData.activities || [])
          setReports(reportsData.reports || [])
          setPending(pendingData.pending || [])
        }
        setLoading(false)
      })
      .catch(() => {
        setError('加载失败')
        setLoading(false)
      })
  }, [])

  const handleHide = async (id: string) => {
    if (!confirm('确定隐藏该活动？')) return
    try {
      const res = await fetch(`/api/admin/activities/${id}/hide`, {
        method: 'POST',
      })
      if (res.ok) {
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'HIDDEN' } : a))
        )
      }
    } catch {
      setError('操作失败')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/admin/pending/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id))
      }
    } catch {
      setError('审批失败')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('确定拒绝该申请？')) return
    try {
      const res = await fetch('/api/admin/pending/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id))
      }
    } catch {
      setError('操作失败')
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 text-center text-gray-400">
          加载中...
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 text-center text-red-500">
          {error}
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-6">
        <h1 className="text-lg font-bold">管理后台</h1>

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            待审核注册 ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400">暂无待审核申请</p>
          ) : (
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-lg border border-gray-100 p-3 text-sm"
                >
                  <p className="font-medium">{p.email}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {p.name || '未填姓名'} | 学号：{p.studentId || '未填'} |{' '}
                    {format(new Date(p.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            举报列表 ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <p className="text-sm text-gray-400">暂无待处理举报</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-lg border border-gray-100 p-3 text-sm"
                >
                  <p className="font-medium">{r.activity.title}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    举报人：{r.reporter.nickname || r.reporter.email.split('@')[0]} |
                    原因：{r.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            所有活动 ({activities.length})
          </h2>
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {a.creator.nickname || a.creator.email.split('@')[0]} |
                      {format(new Date(a.createdAt), 'MM-dd HH:mm', {
                        locale: zhCN,
                      })}
                      | 👥 {a._count.registrations}
                      {a._count.reports > 0 && (
                        <span className="text-red-500 ml-1">
                          🚨 {a._count.reports} 次举报
                        </span>
                      )}
                    </p>
                  </div>
                  {a.status !== 'HIDDEN' && a.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleHide(a.id)}
                      className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      隐藏
                    </button>
                  )}
                </div>
                <span
                  className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${
                    a.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-600'
                      : a.status === 'FULL'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
