// Supabase Edge Function for sending emails via Brevo API
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// The Brevo API key should be set as a secret in Supabase
// Run: supabase secrets set BREVO_API_KEY=your-api-key
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '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';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const emailData = await req.json();
    
    // Validate the email data
    if (!emailData.to || !emailData.subject || !emailData.htmlContent) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: 'The request must include to, subject, and htmlContent fields'
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    console.log(`Sending email to ${JSON.stringify(emailData.to)} with subject "${emailData.subject}"`);
    
    // Send the email using Brevo API
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });
    
    // Get the response data
    const responseData = await response.json();
    
    // Check if the request was successful
    if (!response.ok) {
      console.error('Brevo API error:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    console.log('Email sent successfully:', responseData);
    
    // Return the response
    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: responseData.messageId,
        message: 'Email sent successfully'
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    // Handle errors
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}); 