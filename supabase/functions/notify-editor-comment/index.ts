import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { record } = await req.json()
    
    // Get the team member who received the comment
    const { data: teamMember, error: teamError } = await supabaseClient
      .from('team_members')
      .select('id, name, profile_id')
      .eq('id', record.team_member_id)
      .single()

    if (teamError || !teamMember) {
      console.error('Error fetching team member:', teamError)
      throw new Error('Team member not found')
    }

    // Get the user who made the comment
    const { data: commentUser, error: userError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', record.user_id)
      .single()

    if (userError || !commentUser) {
      console.error('Error fetching comment user:', userError)
      throw new Error('Comment user not found')
    }

    // Check if the team member has a profile and is an editor
    if (teamMember.profile_id) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', teamMember.profile_id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        throw new Error('Profile not found')
      }

      // Only notify if the team member is an editor
      if (profile?.role === 'editor') {
        // Create notification
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: teamMember.profile_id,
            type: 'comment',
            title: 'Nuevo comentario',
            message: `${commentUser.full_name} ha comentado en tu perfil: "${record.content.substring(0, 50)}${record.content.length > 50 ? '...' : ''}"`,
            link_url: `/team/${teamMember.id}#comments`
          })

        if (notificationError) {
          console.error('Error creating notification:', notificationError)
          throw new Error('Failed to create notification')
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Notification sent to editor' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Team member is not an editor, no notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-editor-comment function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})