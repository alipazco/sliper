<script setup lang="ts">
// کارت مناسبتی (بلک فرایدی): همه‌ی محصولات تخفیف‌دار توی یک کادر مشکی، با شمارش معکوس.
const props = defineProps<{ occasion: any; now: number }>()
const { public: { apiBase } } = useRuntimeConfig()

const { data } = await useFetch<any>(`${apiBase}/products/on-sale`, { query: { limit: 120 } })
const products = computed<any[]>(() => data.value?.data?.products ?? [])
const total = computed(() => data.value?.data?.total ?? products.value.length)

const SHOWN = 10
const expanded = ref(false)
const visible = computed(() => (expanded.value ? products.value : products.value.slice(0, SHOWN)))
const maxOff = computed(() => Math.max(0, ...products.value.map(p => p.discount_percent || 0)))

const left = computed(() => Math.max(0, props.occasion.endMs - props.now))
const parts = computed(() => {
  const s = Math.floor(left.value / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    {l: 'روز', v: pad(Math.floor(s / 86400))},
    {l: 'ساعت', v: pad(Math.floor((s % 86400) / 3600))},
    {l: 'دقیقه', v: pad(Math.floor((s % 3600) / 60))},
    {l: 'ثانیه', v: pad(s % 60)},
  ]
})
</script>

<template>
  <section v-if="products.length" class="bf-card">
    <div class="bf-glow" aria-hidden="true"></div>

    <div class="bf-top">
      <div>
        <span class="bf-kicker">BLACK FRIDAY</span>
        <h2 class="bf-title">{{ occasion.title }}</h2>
        <p v-if="occasion.subtitle" class="bf-sub">{{ occasion.subtitle }}</p>
        <p v-else-if="maxOff" class="bf-sub">تا {{ maxOff }}٪ تخفیف روی {{ total }} محصول</p>
      </div>

      <ClientOnly>
        <div class="bf-timer" dir="ltr" aria-label="زمان باقی‌مانده">
          <div v-for="p in parts" :key="p.l" class="bf-t">
            <b>{{ p.v }}</b><small>{{ p.l }}</small>
          </div>
        </div>
      </ClientOnly>
    </div>

    <div class="bf-marquee" aria-hidden="true">
      <div class="bf-marquee-track">
        <span v-for="i in 12" :key="i">BLACK FRIDAY <i>✦</i> بلک فرایدی <i>✦</i> تخفیف ویژه <i>✦</i></span>
      </div>
    </div>

    <div class="bf-grid">
      <ProductTile v-for="p in visible" :key="p.id" :product="p"/>
    </div>

    <div class="bf-actions">
      <button v-if="products.length > SHOWN" type="button" class="bf-btn" @click="expanded = !expanded">
        {{ expanded ? 'نمایش کمتر' : `نمایش همه‌ی ${total} محصول تخفیف‌دار` }}
      </button>
      <NuxtLink to="/products?sort_by=sale" class="bf-link">مشاهده در فروشگاه</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.bf-card {
  @apply relative my-4 overflow-hidden rounded-[2rem] border border-white/10 bg-black p-4 text-white shadow-2xl shadow-black/50 sm:p-6;
  background-image: linear-gradient(160deg, #0b0b0c 0%, #151518 55%, #0b0b0c 100%);
}

.bf-glow {
  @apply pointer-events-none absolute -top-24 right-1/2 h-64 w-[34rem] translate-x-1/2 rounded-full opacity-40 blur-3xl;
  background: radial-gradient(closest-side, #ffbe33, transparent);
}

.bf-top {
  @apply relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between;
}

.bf-kicker {
  @apply inline-block rounded-full bg-mainColor px-3 py-0.5 text-[11px] font-black text-black;
  letter-spacing: .25em;
  direction: ltr;
}

.bf-title {
  @apply mt-2 text-4xl text-white sm:text-5xl;
  text-shadow: 0 0 28px rgba(255, 190, 51, .35);
}

.bf-sub {
  @apply mt-1 text-sm text-white/70;
}

.bf-timer {
  @apply flex gap-2;
}

.bf-t {
  @apply flex min-w-[3.6rem] flex-col items-center rounded-2xl border border-white/15 bg-white/5 px-2 py-2;
}

.bf-t b {
  @apply text-2xl leading-none text-mainColor;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.bf-t small {
  @apply mt-1 text-[10px] text-white/60;
}

.bf-marquee {
  @apply relative -mx-4 my-4 overflow-hidden border-y border-white/10 bg-mainColor py-1.5 text-black sm:-mx-6;
  direction: ltr;
}

.bf-marquee-track {
  @apply flex w-max gap-6 whitespace-nowrap text-xs font-black;
  letter-spacing: .12em;
  animation: bf-scroll 28s linear infinite;
}

.bf-marquee-track i {
  @apply mx-2 not-italic;
}

.bf-grid {
  @apply relative grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5;
}

.bf-actions {
  @apply relative mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center;
}

.bf-btn {
  @apply rounded-full bg-mainColor px-6 py-2.5 text-sm font-black text-black transition hover:brightness-110;
}

.bf-link {
  @apply text-sm text-white/70 underline-offset-4 hover:text-white hover:underline;
}

@keyframes bf-scroll {
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bf-marquee-track {
    animation: none;
  }
}
</style>
