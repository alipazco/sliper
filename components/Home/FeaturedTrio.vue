<script setup lang="ts">
import {numberFormat} from '~/utils/helper'

// منتخب‌های کنار اسلایدر به سبک «تیکر خبری»: کارت‌ها خودکار و یکی‌یکی (روی دسکتاپ عمودی، روی موبایل افقی)
// جابه‌جا می‌شن و کارت بالا پررنگ‌تر دیده می‌شه. با نگه‌داشتن موس/انگشت متوقف می‌شه.
const props = defineProps<{ products: any[]; label: string }>()

const VISIBLE = 3
const INTERVAL = 3400
const n = computed(() => props.products.length)
const canSlide = computed(() => n.value > VISIBLE)
// برای چرخش بی‌درز، سه کارت اول در انتهای لیست تکرار می‌شن
const items = computed(() => (canSlide.value ? [...props.products, ...props.products.slice(0, VISIBLE)] : props.products))

const pos = ref(0)
const animate = ref(true)
const paused = ref(false)
const isDesktop = ref(false)
const step = ref(0)
const viewH = ref(0)

const viewEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)

const activeIndex = computed(() => pos.value % Math.max(1, n.value))

const trackStyle = computed(() => {
  const d = pos.value * step.value
  return {
    transform: isDesktop.value ? `translate3d(0, ${-d}px, 0)` : `translate3d(${d}px, 0, 0)`, // RTL: جلو رفتن = حرکت به راست
    transition: animate.value ? 'transform 700ms cubic-bezier(.65,.05,.25,1)' : 'none',
  }
})

function measureStep() {
  const cards = trackEl.value?.children
  if (cards && cards.length > 1) {
    const a = cards[0] as HTMLElement, b = cards[1] as HTMLElement
    step.value = isDesktop.value ? b.offsetTop - a.offsetTop : Math.abs(b.offsetLeft - a.offsetLeft)
  }
}

function measure() {
  isDesktop.value = window.matchMedia('(min-width: 1024px)').matches
  if (viewEl.value) viewH.value = viewEl.value.clientHeight
  nextTick(measureStep)
}

// ارتفاع کارت‌ها به ارتفاع قاب بسته است؛ بعد از هر تغییرش گام دوباره اندازه‌گیری می‌شه
watch(viewH, () => nextTick(measureStep))

function next() {
  if (!canSlide.value) return
  measureStep()
  animate.value = true
  pos.value += 1
}

function prev() {
  if (!canSlide.value) return
  if (pos.value === 0) { // از ابتدا به انتهای لیست تکراری بپر و بعد یک قدم عقب بیا
    animate.value = false
    pos.value = n.value
    requestAnimationFrame(() => requestAnimationFrame(() => { animate.value = true; pos.value -= 1 }))
  } else {
    animate.value = true
    pos.value -= 1
  }
}

function onTransitionEnd(e: TransitionEvent) {
  if (e.target !== trackEl.value || e.propertyName !== 'transform') return
  if (canSlide.value && pos.value >= n.value) {
    animate.value = false
    pos.value = 0
  }
}

// لمس: کشیدن افقی روی موبایل
let touchX = 0
function onTouchStart(e: TouchEvent) { paused.value = true; touchX = e.touches[0].clientX }
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 40) (dx < 0 ? next : prev)() // در RTL کشیدن به چپ = بعدی
  setTimeout(() => (paused.value = false), 1500)
}

let timer: ReturnType<typeof setInterval> | null = null
let ro: ResizeObserver | null = null
const onVisibility = () => { paused.value = document.hidden }

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (viewEl.value) ro.observe(viewEl.value)
  window.addEventListener('resize', measure)
  document.addEventListener('visibilitychange', onVisibility)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) timer = setInterval(() => { if (!paused.value) next() }, INTERVAL)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  ro?.disconnect()
  window.removeEventListener('resize', measure)
  document.removeEventListener('visibilitychange', onVisibility)
})

watch(() => props.products, () => { pos.value = 0; animate.value = false; measure() })
</script>

<template>
  <div class="flex min-w-0 flex-col lg:h-[min(64vh,520px)]">
    <!-- سرتیتر تیکر -->
    <div class="ticker-head">
      <span class="ticker-live"><i></i>ویژه</span>
      <h2 class="min-w-0 flex-1 truncate text-sm font-black text-white lg:text-base">{{ label }}</h2>
      <span v-if="canSlide" class="ticker-count">{{ activeIndex + 1 }}<small>/{{ n }}</small></span>
    </div>
    <div v-if="canSlide" class="ticker-bar" aria-hidden="true">
      <i :key="pos" :style="{animationDuration: INTERVAL + 'ms', animationPlayState: paused ? 'paused' : 'running'}"></i>
    </div>

    <div ref="viewEl" class="ticker-view"
         @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false"
         @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <div ref="trackEl" class="ticker-track" :style="[trackStyle, {'--view-h': viewH + 'px'}]" @transitionend="onTransitionEnd">
        <NuxtLink v-for="(p, i) in items" :key="`${p.id}-${i}`" :to="`/products/${p.slug}`"
                  class="trio-card group" :class="{'is-active': i === pos}">
          <span class="trio-img">
            <img :src="p.primary_image || '/images/preloader.png'" :alt="p.name" loading="lazy"
                 class="h-full w-full object-cover transition duration-700 group-hover:scale-110">
            <span v-if="p.on_sale && p.discount_percent" class="trio-badge">{{ p.discount_percent }}٪</span>
          </span>

          <span class="min-w-0 flex-1">
            <span v-if="p.category" class="block truncate text-[11px] text-gray-400">{{ p.category }}</span>
            <span class="line-clamp-2 text-sm font-black leading-6 text-secColor lg:text-base">{{ p.name }}</span>
            <span class="mt-1 flex items-baseline gap-2">
              <span class="text-sm font-black" :class="p.on_sale ? 'text-cosColor' : 'text-secColor'">
                {{ numberFormat(p.final_price ?? p.min_price) }} <small class="text-[11px] font-normal">تومان</small>
              </span>
              <span v-if="p.on_sale" class="text-xs text-gray-400 line-through">{{ numberFormat(p.regular_price) }}</span>
            </span>
          </span>

          <span class="trio-go" aria-hidden="true">
            <UIcon name="material-symbols:arrow-back-rounded" class="h-4 w-4"/>
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticker-head {
  @apply flex items-center gap-2 rounded-2xl bg-secColor px-3 py-2 shadow-md shadow-gray-400/40;
}

.ticker-live {
  @apply inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mainColor px-2.5 py-0.5 text-xs font-black text-secColor;
}

.ticker-live i {
  @apply h-2 w-2 animate-pulse rounded-full bg-cosColor;
}

.ticker-count {
  @apply shrink-0 text-sm font-black text-mainColor;
}

.ticker-count small {
  @apply text-[11px] font-normal text-gray-400;
}

.ticker-bar {
  @apply mx-3 mb-2 h-[3px] overflow-hidden rounded-full bg-gray-300/60;
}

.ticker-bar i {
  @apply block h-full w-full origin-right rounded-full bg-mainColor;
  animation: ticker-fill linear forwards;
}

.ticker-view {
  @apply relative -mx-3 mt-2 min-h-0 flex-1 overflow-hidden px-3 pb-2 lg:mx-0 lg:mt-0 lg:px-0 lg:pb-0;
}

/* موبایل: ردیف افقی */
.ticker-track {
  @apply flex gap-3 will-change-transform;
}

.trio-card {
  @apply relative flex h-[104px] w-[82%] shrink-0 items-center gap-3 rounded-3xl bg-white p-2.5 opacity-80 shadow-md shadow-gray-300/70 transition-[opacity,box-shadow,transform] duration-500 hover:shadow-xl sm:w-[60%];
}

.trio-card.is-active {
  @apply opacity-100 shadow-lg shadow-mainColor/30 ring-2 ring-mainColor;
}

.trio-img {
  @apply relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100;
}

.trio-badge {
  @apply absolute right-1 top-1 rounded-full bg-cosColor px-1.5 py-0.5 text-[10px] font-bold leading-none text-white;
}

.trio-go {
  @apply grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mainColor/20 text-secColor transition duration-300 group-hover:-translate-x-1 group-hover:bg-mainColor;
}

/* دسکتاپ: ستون عمودی؛ سه کارت هم‌قد قاب دیده می‌شن */
@media (min-width: 1024px) {
  .ticker-view {
    @apply mt-2;
  }

  .ticker-track {
    @apply flex-col;
  }

  .trio-card {
    @apply w-auto p-3;
    height: calc((var(--view-h, 360px) - 24px) / 3);
  }

  .trio-img {
    @apply h-full w-auto;
    aspect-ratio: 1 / 1;
    max-height: 7.5rem;
  }
}

@keyframes ticker-fill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-bar i {
    animation: none;
  }
}
</style>
