// ساخت عکس برنددار (لوگو + نشانی سایت + نام محصول) برای ذخیره و اشتراک‌گذاری.
// همه‌چیز سمت مرورگر روی canvas انجام می‌شود تا هر عکسی که دانلود می‌شود لوگو داشته باشد.

const LOGO_SRC = '/images/logo-watermark.png'
const SITE = 'slipperpaz.ir'
const SIZE = 1080

async function loadImage(src: string): Promise<HTMLImageElement> {
  // data:/blob: بدون مشکل؛ برای آدرس‌های معمولی از fetch→blob استفاده می‌کنیم تا canvas آلوده (tainted) نشود
  let url = src
  let revoke = false
  if (!src.startsWith('data:') && !src.startsWith('blob:')) {
    const res = await fetch(src, {mode: 'cors'})
    if (!res.ok) throw new Error('image fetch failed')
    url = URL.createObjectURL(await res.blob())
    revoke = true
  }
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image decode failed'))
      img.src = url
    })
  } finally {
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function containRect(iw: number, ih: number, w: number, h: number) {
  const s = Math.min(w / iw, h / ih)
  return {w: iw * s, h: ih * s, x: (w - iw * s) / 2, y: (h - ih * s) / 2}
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

export type PlaceState = { x: number; y: number; scale: number; rotate: number }

export interface BrandedOptions {
  /** عکس اصلی (نتیجه‌ی هوش مصنوعی یا عکس کاربر) */
  base: string
  productName?: string
  /** حالت دستی: عکس محصول و موقعیتش روی صحنه‌ی مربعی */
  overlay?: { src: string; place: PlaceState }
}

export async function makeBrandedImage(opts: BrandedOptions): Promise<Blob> {
  try {
    await document.fonts?.load('700 40px Vazir')
    await document.fonts?.ready
  } catch { /* فونت سیستم جایگزین می‌شود */
  }

  const [base, logo, over] = await Promise.all([
    loadImage(opts.base),
    loadImage(LOGO_SRC),
    opts.overlay ? loadImage(opts.overlay.src) : Promise.resolve(null),
  ])

  // حالت دستی همان صحنه‌ی مربعی است؛ نتیجه‌ی AI با نسبت خودش (حداکثر ۱۳۵۰ ارتفاع)
  const manual = !!opts.overlay
  const W = SIZE
  let H = manual ? SIZE : Math.round(Math.min(1350, Math.max(720, (base.height / base.width) * W)))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, W, H)
  const r = containRect(base.width, base.height, W, H)
  ctx.drawImage(base, r.x, r.y, r.w, r.h)

  if (over && opts.overlay) {
    const p = opts.overlay.place
    const ow = (p.scale / 100) * W
    const oh = ow * (over.height / over.width)
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.translate((p.x / 100) * W, (p.y / 100) * H)
    ctx.rotate((p.rotate * Math.PI) / 180)
    ctx.drawImage(over, -ow / 2, -oh / 2, ow, oh)
    ctx.restore()
  }

  // نوار برند پایین
  const barH = 150
  const g = ctx.createLinearGradient(0, H - barH - 70, 0, H)
  g.addColorStop(0, 'rgba(34,40,49,0)')
  g.addColorStop(0.45, 'rgba(34,40,49,0.82)')
  g.addColorStop(1, 'rgba(34,40,49,0.96)')
  ctx.fillStyle = g
  ctx.fillRect(0, H - barH - 70, W, barH + 70)

  const lh = 92
  const lw = lh * (logo.width / logo.height)
  ctx.drawImage(logo, 36, H - lh - 30, lw, lh)

  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  if (opts.productName) {
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 38px Vazir, Tahoma, sans-serif'
    ctx.fillText(fitText(ctx, opts.productName, W - lw - 36 * 3), W - 36, H - 74)
  }
  ctx.direction = 'ltr'
  ctx.fillStyle = '#ffbe33'
  ctx.font = '700 32px Vazir, Tahoma, sans-serif'
  ctx.fillText(SITE, W - 36, H - 30)

  // لوگوی کم‌رنگ گوشه‌ی بالا (برای اینکه با کراپ پایین هم برند حفظ شود)
  const sw = 150
  ctx.globalAlpha = 0.75
  ctx.drawImage(logo, 28, 28, sw, sw * (logo.height / logo.width))
  ctx.globalAlpha = 1

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function canShareFile(blob: Blob, name: string) {
  try {
    const f = new File([blob], name, {type: blob.type})
    return !!(navigator as any).canShare?.({files: [f]})
  } catch {
    return false
  }
}

export async function shareBlob(blob: Blob, name: string, text: string) {
  const f = new File([blob], name, {type: blob.type})
  await (navigator as any).share({files: [f], text, title: 'پروب مجازی اسلیپرپاز'})
}
