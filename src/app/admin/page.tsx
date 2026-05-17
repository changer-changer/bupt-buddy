'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Navbar from '@/components/navbar'

type Tab = 'overview' | 'pending' | 'reports' | 'users' | 'activities' | 'audit'

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

interface PendingApproval {
  id: string
  email: string
  name: string | null
  studentId: string | null
  createdAt: string
}

interface UserItem {
  id: string
  email: string
  nickname: string | null
  role: string
  createdAt: string
  _count: { activities: number; registrations: number }
}

interface AuditLogItem {
  id: string
  action: string
  targetType: string
  targetId: string | null
  details: string | null
  ip: string | null
  createdAt: string
  actor: { nickname: string | null; email: string } | null
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

function usePaginatedData<T>(
  url: string,
  active: boolean,
  search?: string
) {
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!active) return
    setLoading(true)
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search) query.set('search', search)
      const res = await fetch(`${url}?${query}`)
      const json = await res.json()
      if (!json.error) {
        const key = Object.keys(json).find((k) => Array.isArray(json[k]))
        setData(key ? json[key] : [])
        setTotal(json.total || 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [url, active, page, pageSize, search])

  useEffect(() => {
    load()
  }, [load])

  return { data, total, page, pageSize, loading, setPage, refresh: load }
}

function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-gray-500">
        第 {page} / {totalPages} 页，共 {total} 条
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
        >
          上一页
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
        >
          下一页
        </button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState({
    users: 0,
    activities: 0,
    pending: 0,
    reports: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const [userSearch, setUserSearch] = useState('')
  const [activitySearch, setActivitySearch] = useState('')

  // Admin guard verification modal
  const [showGuardModal, setShowGuardModal] = useState(false)
  const [guardEmail, setGuardEmail] = useState('')
  const [guardCode, setGuardCode] = useState('')
  const [guardLoading, setGuardLoading] = useState(false)
  const [guardError, setGuardError] = useState('')
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const usersQuery = usePaginatedData<UserItem>('/api/admin/users', tab === 'users', userSearch)
  const activitiesQuery = usePaginatedData<Activity>('/api/admin/activities', tab === 'activities', activitySearch)
  const reportsQuery = usePaginatedData<Report>('/api/admin/reports', tab === 'reports')
  const pendingQuery = usePaginatedData<PendingApproval>('/api/admin/pending', tab === 'pending')
  const auditQuery = usePaginatedData<AuditLogItem>('/api/admin/audit-logs', tab === 'audit')

  const isGuardError = (res: Response) => res.status === 403

  const handleGuardVerify = async () => {
    if (!guardEmail || !guardCode) {
      setGuardError('请填写邮箱和验证码')
      return
    }
    setGuardLoading(true)
    setGuardError('')
    try {
      const res = await fetch('/api/auth/admin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guardEmail, code: guardCode }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setShowGuardModal(false)
        setGuardCode('')
        if (pendingAction) {
          pendingAction()
          setPendingAction(null)
        }
      } else {
        setGuardError(data.error || '验证失败')
      }
    } catch {
      setGuardError('网络错误')
    } finally {
      setGuardLoading(false)
    }
  }

  useEffect(() => {
    if (tab !== 'overview') return
    setStatsLoading(true)
    Promise.all([
      fetch('/api/admin/users?page=1&pageSize=1').then((r) => r.json()),
      fetch('/api/admin/activities?page=1&pageSize=1').then((r) => r.json()),
      fetch('/api/admin/pending?page=1&pageSize=1').then((r) => r.json()),
      fetch('/api/admin/reports?page=1&pageSize=1').then((r) => r.json()),
    ])
      .then(([u, a, p, r]) => {
        setStats({
          users: u.total || 0,
          activities: a.total || 0,
          pending: p.total || 0,
          reports: r.total || 0,
        })
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [tab])

  const handleHide = async (id: string) => {
    if (!confirm('确定隐藏该活动？')) return
    const doHide = async () => {
      try {
        const res = await fetch(`/api/admin/activities/${id}/hide`, { method: 'POST' })
        if (isGuardError(res)) {
          const data = await res.json()
          setGuardError(data.error || '')
          setPendingAction(() => () => handleHide(id))
          setShowGuardModal(true)
          return
        }
        if (res.ok) {
          activitiesQuery.refresh()
        }
      } catch {
        alert('操作失败')
      }
    }
    doHide()
  }

  const handleDeleteActivity = async (id: string, title: string) => {
    if (!confirm(`确定删除活动「${title}」？此操作不可撤销。`)) return
    const doDelete = async () => {
      try {
        const res = await fetch(`/api/admin/activities/${id}/delete`, { method: 'POST' })
        if (isGuardError(res)) {
          const data = await res.json()
          setGuardError(data.error || '')
          setPendingAction(() => () => handleDeleteActivity(id, title))
          setShowGuardModal(true)
          return
        }
        if (res.ok) {
          activitiesQuery.refresh()
          setStats((s) => ({ ...s, activities: Math.max(0, s.activities - 1) }))
        } else {
          const data = await res.json()
          alert(data.error || '删除失败')
        }
      } catch {
        alert('删除失败')
      }
    }
    doDelete()
  }

  const handleApprove = async (id: string) => {
    const doApprove = async () => {
      try {
        const res = await fetch('/api/admin/pending/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (isGuardError(res)) {
          const data = await res.json()
          setGuardError(data.error || '')
          setPendingAction(() => () => handleApprove(id))
          setShowGuardModal(true)
          return
        }
        if (res.ok) {
          pendingQuery.refresh()
          setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }))
        }
      } catch {
        alert('审批失败')
      }
    }
    doApprove()
  }

  const handleReject = async (id: string) => {
    if (!confirm('确定拒绝该申请？')) return
    const doReject = async () => {
      try {
        const res = await fetch('/api/admin/pending/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (isGuardError(res)) {
          const data = await res.json()
          setGuardError(data.error || '')
          setPendingAction(() => () => handleReject(id))
          setShowGuardModal(true)
          return
        }
        if (res.ok) {
          pendingQuery.refresh()
          setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }))
        }
      } catch {
        alert('操作失败')
      }
    }
    doReject()
  }

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`确定删除用户 ${email}？此操作不可撤销。`)) return
    const doDelete = async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}/delete`, { method: 'POST' })
        if (isGuardError(res)) {
          const data = await res.json()
          setGuardError(data.error || '')
          setPendingAction(() => () => handleDeleteUser(id, email))
          setShowGuardModal(true)
          return
        }
        if (res.ok) {
          usersQuery.refresh()
        } else {
          const data = await res.json()
          alert(data.error || '删除失败')
        }
      } catch {
        alert('删除失败')
      }
    }
    doDelete()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'pending', label: `待审核${stats.pending > 0 ? ` (${stats.pending})` : ''}` },
    { key: 'reports', label: `举报${stats.reports > 0 ? ` (${stats.reports})` : ''}` },
    { key: 'users', label: '用户' },
    { key: 'activities', label: '活动' },
    { key: 'audit', label: '日志' },
  ]

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4">
        <h1 className="text-lg font-bold mb-4">管理后台</h1>

        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '用户总数', value: stats.users },
              { label: '活动总数', value: stats.activities },
              { label: '待审核', value: stats.pending, highlight: stats.pending > 0 },
              { label: '待处理举报', value: stats.reports, highlight: stats.reports > 0 },
            ].map((card) => (
              <div
                key={card.label}
                className={`bg-white rounded-xl border p-4 ${
                  card.highlight ? 'border-red-200 bg-red-50' : 'border-gray-100'
                }`}
              >
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.highlight ? 'text-red-600' : 'text-gray-900'}`}>
                  {statsLoading ? '-' : card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'pending' && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 mb-2">待审核注册</h2>
            {pendingQuery.loading ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : pendingQuery.data.length === 0 ? (
              <p className="text-sm text-gray-400">暂无待审核申请</p>
            ) : (
              <>
                <div className="space-y-2">
                  {pendingQuery.data.map((p) => (
                    <div key={p.id} className="bg-white rounded-lg border border-gray-100 p-3 text-sm">
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
                <Pagination
                  page={pendingQuery.page}
                  pageSize={pendingQuery.pageSize}
                  total={pendingQuery.total}
                  onChange={pendingQuery.setPage}
                />
              </>
            )}
          </section>
        )}

        {tab === 'reports' && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 mb-2">举报列表</h2>
            {reportsQuery.loading ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : reportsQuery.data.length === 0 ? (
              <p className="text-sm text-gray-400">暂无待处理举报</p>
            ) : (
              <>
                <div className="space-y-2">
                  {reportsQuery.data.map((r) => (
                    <div key={r.id} className="bg-white rounded-lg border border-gray-100 p-3 text-sm">
                      <p className="font-medium">{r.activity.title}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        举报人：{r.reporter.nickname || r.reporter.email.split('@')[0]} | 原因：{r.reason}
                      </p>
                    </div>
                  ))}
                </div>
                <Pagination
                  page={reportsQuery.page}
                  pageSize={reportsQuery.pageSize}
                  total={reportsQuery.total}
                  onChange={reportsQuery.setPage}
                />
              </>
            )}
          </section>
        )}

        {tab === 'users' && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-medium text-gray-500">所有用户</h2>
              <input
                type="text"
                placeholder="搜索姓名或邮箱"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  usersQuery.setPage(1)
                }}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {usersQuery.loading ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : usersQuery.data.length === 0 ? (
              <p className="text-sm text-gray-400">暂无用户</p>
            ) : (
              <>
                <div className="space-y-2">
                  {usersQuery.data.map((u) => (
                    <div key={u.id} className="bg-white rounded-lg border border-gray-100 p-3 text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {u.nickname || u.email.split('@')[0]}
                            {u.role === 'ADMIN' && (
                              <span className="ml-1 text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                                管理员
                              </span>
                            )}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {u.email} | 活动：{u._count.activities} | 报名：{u._count.registrations} |{' '}
                            {format(new Date(u.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  page={usersQuery.page}
                  pageSize={usersQuery.pageSize}
                  total={usersQuery.total}
                  onChange={usersQuery.setPage}
                />
              </>
            )}
          </section>
        )}

        {tab === 'activities' && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-medium text-gray-500">所有活动</h2>
              <input
                type="text"
                placeholder="搜索活动标题"
                value={activitySearch}
                onChange={(e) => {
                  setActivitySearch(e.target.value)
                  activitiesQuery.setPage(1)
                }}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {activitiesQuery.loading ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : (
              <>
                <div className="space-y-2">
                  {activitiesQuery.data.map((a) => (
                    <div key={a.id} className="bg-white rounded-lg border border-gray-100 p-3">
                      <div className="flex items-start justify-between">
                        <div className="text-sm">
                          <p className="font-medium">{a.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {a.creator.nickname || a.creator.email.split('@')[0]} |
                            {format(new Date(a.createdAt), 'MM-dd HH:mm', { locale: zhCN })} | 👥{' '}
                            {a._count.registrations}
                            {a._count.reports > 0 && (
                              <span className="text-red-500 ml-1">🚨 {a._count.reports} 次举报</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {a.status !== 'HIDDEN' && a.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleHide(a.id)}
                              className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
                            >
                              隐藏
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteActivity(a.id, a.title)}
                            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            删除
                          </button>
                        </div>
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
                <Pagination
                  page={activitiesQuery.page}
                  pageSize={activitiesQuery.pageSize}
                  total={activitiesQuery.total}
                  onChange={activitiesQuery.setPage}
                />
              </>
            )}
          </section>
        )}

        {tab === 'audit' && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 mb-2">操作日志</h2>
            {auditQuery.loading ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : auditQuery.data.length === 0 ? (
              <p className="text-sm text-gray-400">暂无日志</p>
            ) : (
              <>
                <div className="space-y-2">
                  {auditQuery.data.map((log) => (
                    <div key={log.id} className="bg-white rounded-lg border border-gray-100 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{log.action}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(log.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        操作人：{log.actor?.nickname || log.actor?.email || '系统'} | 对象：{log.targetType}
                        {log.targetId && ` (${log.targetId.slice(0, 8)}...)`}
                      </p>
                      {log.details && <p className="text-gray-500 text-xs mt-0.5">{log.details}</p>}
                      {log.ip && <p className="text-gray-400 text-xs mt-0.5">IP: {log.ip}</p>}
                    </div>
                  ))}
                </div>
                <Pagination
                  page={auditQuery.page}
                  pageSize={auditQuery.pageSize}
                  total={auditQuery.total}
                  onChange={auditQuery.setPage}
                />
              </>
            )}
          </section>
        )}

        {/* Admin Guard Modal */}
        {showGuardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-5">
              <h3 className="font-bold text-gray-900 mb-1">管理员身份验证</h3>
              <p className="text-sm text-gray-500 mb-4">
                关键操作需要二次验证。请输入管理员邮箱及验证码。
              </p>
              {guardError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {guardError}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">管理员邮箱</label>
                  <input
                    type="email"
                    value={guardEmail}
                    onChange={(e) => setGuardEmail(e.target.value)}
                    placeholder="admin@bupt.cn"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={guardCode}
                      onChange={(e) => setGuardCode(e.target.value)}
                      placeholder="6位验证码"
                      maxLength={6}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={async () => {
                        if (!guardEmail) {
                          setGuardError('请先输入邮箱')
                          return
                        }
                        try {
                          const res = await fetch('/api/auth/send-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: guardEmail }),
                          })
                          const data = await res.json()
                          if (res.ok) {
                            setGuardError('')
                            alert('验证码已发送')
                          } else {
                            setGuardError(data.error || '发送失败')
                          }
                        } catch {
                          setGuardError('网络错误')
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 whitespace-nowrap"
                    >
                      获取验证码
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => {
                    setShowGuardModal(false)
                    setPendingAction(null)
                    setGuardError('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleGuardVerify}
                  disabled={guardLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {guardLoading ? '验证中...' : '验证'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
