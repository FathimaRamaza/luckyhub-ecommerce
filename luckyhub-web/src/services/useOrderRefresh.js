import { useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

export function useOrderRefresh(name, refresh) {
  const refreshRef = useRef(refresh)
  useEffect(() => { refreshRef.current = refresh }, [refresh])
  useEffect(() => {
    const reload = () => { if (document.visibilityState === 'visible') refreshRef.current() }
    const channel = supabase?.channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, reload)
      .subscribe((status) => { if (status === 'SUBSCRIBED') reload() })
    window.addEventListener('luckyhub:orders-updated', reload)
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', reload)
    return () => {
      window.removeEventListener('luckyhub:orders-updated', reload)
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', reload)
      if (channel) supabase.removeChannel(channel)
    }
  }, [name])
}
