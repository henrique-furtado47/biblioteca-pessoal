import { useUiStore } from '@/stores/ui.store'

export function useToast() {
  const ui = useUiStore()
  return {
    success: (m, t) => ui.success(m, t),
    error: (m, t) => ui.error(m, t),
    info: (m, t) => ui.info(m, t),
  }
}
