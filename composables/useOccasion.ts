// مناسبت فعال (مثلاً بلک فرایدی). سمت سرور خونده می‌شه تا صفحه از همون ابتدا با تم درست بیاد؛
// بعد از پایان زمان، خودکار و بدون رفرش به حالت عادی برمی‌گرده.
export function useOccasion() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useFetch<any>(`${apiBase}/occasions/active`, { key: 'active-occasion', default: () => null })
  const now = ref(Date.now())

  onMounted(() => {
    const t = setInterval(() => { now.value = Date.now() }, 1000)
    onBeforeUnmount(() => clearInterval(t))
  })

  const occasion = computed(() => {
    const o = data.value?.data
    if (!o) return null
    const end = new Date(o.ends_at).getTime()
    const start = new Date(o.starts_at).getTime()
    return now.value >= start && now.value < end ? { ...o, endMs: end } : null
  })

  return { occasion, now }
}
