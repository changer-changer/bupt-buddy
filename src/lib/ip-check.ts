function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function isInRange(ip: string, cidr: string): boolean {
  const [baseIp, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr, 10)
  const mask = -1 << (32 - prefix)
  const ipLong = ipToLong(ip)
  const baseLong = ipToLong(baseIp)
  return (ipLong & mask) === (baseLong & mask)
}

const BUPT_RANGES = [
  '202.112.0.0/16',
  '211.68.0.0/16',
  '219.224.0.0/16',
  '222.28.0.0/16',
  '222.29.0.0/16',
  '123.121.0.0/16',
  '59.64.0.0/16',
  '118.229.0.0/16',
]

export function isBuptIp(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return false
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1], 10)
    if (second >= 16 && second <= 31) return true
  }
  if (ip.startsWith('192.168.')) return true

  for (const range of BUPT_RANGES) {
    if (isInRange(ip, range)) return true
  }
  return false
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
