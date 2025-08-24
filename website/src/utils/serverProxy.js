/**
 * Server proxy utility for handling API calls that would otherwise be blocked by CORS
 * This is a placeholder for a real server-side implementation
 * In production, replace this with a real serverless function or API endpoint
 */

// Configuration for the email service
const EMAIL_CONFIG = {
  apiKey: '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',
  apiUrl: 'https://api.brevo.com/v3/smtp/email'
};

/**
 * Mock server function to handle email sending
 * In production, this would be replaced with an actual serverless function
 * 
 * @param {Object} emailData - Email data to send
 * @returns {Promise<Object>} - Response from the email API
 */
export const sendEmailViaServer = async (emailData) => {
  console.log('Server proxy: Sending email via mock server function');
  console.log('Email data:', emailData);
  
  // In a real implementation, this would be a server-side API call
  // For now, we'll simulate a successful response
  return {
    messageId: `mock-server-${Date.now()}`,
    success: true,
    message: 'Email sent via mock server (simulation)'
  };
};

/**
 * Implementation guide for a real server-side function
 * 
 * This is a guide for implementing a real server-side function to handle email sending
 * You can use this as a template for creating a Supabase Edge Function, Netlify Function,
 * Vercel API Route, or any other serverless function
 * 
 * Example implementation for a Supabase Edge Function:
 * 
 * ```js
 * // supabase/functions/send-email/index.js
 * import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
 * 
 * const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
 * const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
 * 
 * serve(async (req) => {
 *   try {
 *     // Parse the request body
 *     const emailData = await req.json()
 *     
 *     // Validate the email data
 *     if (!emailData.to || !emailData.subject || !emailData.htmlContent) {
 *       return new Response(
 *         JSON.stringify({ error: 'Missing required fields' }),
 *         { status: 400, headers: { 'Content-Type': 'application/json' } }
 *       )
 *     }
 *     
 *     // Send the email using Brevo API
 *     const response = await fetch(BREVO_API_URL, {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'api-key': BREVO_API_KEY
 *       },
 *       body: JSON.stringify(emailData)
 *     })
 *     
 *     // Get the response data
 *     const responseData = await response.json()
 *     
 *     // Return the response
 *     return new Response(
 *       JSON.stringify(responseData),
 *       { status: response.status, headers: { 'Content-Type': 'application/json' } }
 *     )
 *   } catch (error) {
 *     // Handle errors
 *     return new Response(
 *       JSON.stringify({ error: error.message }),
 *       { status: 500, headers: { 'Content-Type': 'application/json' } }
 *     )
 *   }
 * })
 * ```
 * 
 * To deploy this function to Supabase:
 * 1. Install Supabase CLI: `npm install -g supabase`
 * 2. Initialize Supabase in your project: `supabase init`
 * 3. Create the function: `supabase functions new send-email`
 * 4. Copy the above code to `supabase/functions/send-email/index.js`
 * 5. Set the secret: `supabase secrets set BREVO_API_KEY=your-api-key`
 * 6. Deploy the function: `supabase functions deploy send-email`
 * 
 * Then update the emailService.js file to use this function instead of direct API calls.
 */

/**
 * Check if the application is running in a production environment
 * @returns {boolean} - True if in production, false otherwise
 */
export const isProduction = () => {
  // Check for production environment variables
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // Check for production domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Add your production domain(s) here
    if (hostname !== 'localhost' && 
        !hostname.includes('127.0.0.1') && 
        !hostname.includes('192.168.') && 
        !hostname.includes('.local')) {
      return true;
    }
  }
  
  // Default to development mode
  return false;
}; 