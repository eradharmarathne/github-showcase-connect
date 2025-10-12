import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Create a client with the user's token for authentication
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated and get their profile
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's profile to check tenant_id
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'User profile or tenant not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Handle file upload
      const formData = await req.formData()
      const file = formData.get('file') as File
      const expenseId = formData.get('expenseId') as string

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create a unique filename with tenant isolation
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const fileName = `${profile.tenant_id}/${timestamp}-${randomId}.${fileExt}`

      // Upload file using admin client (bypasses RLS)
      const { data, error } = await supabaseAdmin.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Upload error:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get the public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('receipts')
        .getPublicUrl(data.path)

      return new Response(
        JSON.stringify({ success: true, url: publicUrl, path: data.path }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      // Handle file deletion
      const { fileUrl } = await req.json()
      
      if (!fileUrl) {
        return new Response(
          JSON.stringify({ error: 'No file URL provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Extract file path from URL
      const urlParts = fileUrl.split('/storage/v1/object/public/receipts/')
      if (urlParts.length !== 2) {
        return new Response(
          JSON.stringify({ error: 'Invalid file URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const filePath = urlParts[1]
      
      // Verify the file belongs to the user's tenant
      if (!filePath.startsWith(profile.tenant_id + '/')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to delete this file' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete file using admin client
      const { error } = await supabaseAdmin.storage
        .from('receipts')
        .remove([filePath])

      if (error) {
        console.error('Delete error:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})