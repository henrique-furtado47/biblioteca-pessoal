import { useUiStore } from '@/stores/ui.store'

export function useConfirm() {
  const ui = useUiStore()
  return (options) => ui.confirm(options)
}
