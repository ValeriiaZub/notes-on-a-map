'use server'

import { createClient } from '@/lib/utils/supabase/server'
import MainMapView from '@/components/mainViewComponent'

export default async function Home() {
  console.log('[page] Component rendering');
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const isAuthenticated = !!data.user

  if (error || !data?.user) {
    return <>
      {error}
      {data?.user}
    </>
  }

  return (
    <MainMapView isAuthenticated={isAuthenticated} />
  )
}
