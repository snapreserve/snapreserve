import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Keep backward compatibility
export const supabase = createBrowserClient(
  'https://xkjqflzhaiqndzzeuoyb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhranFmbHpoYWlxbmR6emV1b3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDAxOTQsImV4cCI6MjA4NzkxNjE5NH0.i7IcEHHVAavJ56LcmQw73nL0WN7C68kATm0OYZeZOqM'
)