import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xkjqflzhaiqndzzeuoyb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhranFmbHpoYWlxbmR6emV1b3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDAxOTQsImV4cCI6MjA4NzkxNjE5NH0.i7IcEHHVAavJ56LcmQw73nL0WN7C68kATm0OYZeZOqM'

export const supabase = createClient(supabaseUrl, supabaseKey)