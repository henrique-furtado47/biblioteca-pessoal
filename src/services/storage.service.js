import { supabase } from './supabase'

const BUCKET = 'covers'

export const storageService = {
  /**
   * Faz upload da capa sob o prefixo do usuário: {userId}/{timestamp}-{nome}
   * Retorna a URL pública.
   */
  async uploadCover(file, userId) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safe = Math.random().toString(36).slice(2)
    const path = `${userId}/${Date.now()}-${safe}.${ext}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw error

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  },

  /** Remove uma capa a partir da URL pública (best-effort). */
  async removeCover(publicUrl) {
    if (!publicUrl) return
    const marker = `/${BUCKET}/`
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return
    const path = publicUrl.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([path])
  },
}
