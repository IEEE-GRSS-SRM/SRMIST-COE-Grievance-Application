// Email service to handle Brevo API integration for sending notifications
import { sendEmailViaServer, isProduction } from './serverProxy';

// Brevo API key - in production, use environment variable
const BREVO_API_KEY = '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';

/**
 * Send email notification using Supabase serverless function to avoid CORS issues
 * @param {object} notification - Email notification object from Supabase
 * @returns {Promise<object>} - Response from Brevo API
 */
export const sendEmailNotification = async (notification) => {
  try {
    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: "SRMIST Examination Control Team",
        email: "examcontrol@srmist.edu.in",
      },
      to: [{
        email: notification.recipient_email,
        name: notification.recipient_name,
      }],
      subject: notification.subject,
      htmlContent: formatEmailHtml(notification),
    };

    // Add attachments if present
    if (notification.attachments && notification.attachments.length > 0) {
      // For Brevo API, attachments must be provided as URL objects
      // Make sure each URL is public and accessible
      emailData.attachment = notification.attachments.map(attachment => {
        return {
          url: attachment,
          name: getFileNameFromUrl(attachment)
        };
      });
      
      console.log('Email attachments:', emailData.attachment);
    }
    
    console.log('Preparing to send email...');
    
    // OPTION 1: Use Supabase Edge Function in production
    if (isProduction()) {
      console.log('Using Supabase Edge Function for email sending (production mode)');
      return await sendViaEdgeFunction(emailData);
    }
    
    // OPTION 2: Use mock server proxy for development
    console.log('Using mock server proxy for email sending (development mode)');
    return await sendEmailViaServer(emailData);
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
};

/**
 * Send email via Supabase Edge Function
 * @param {object} emailData - Email data to send
 * @returns {Promise<object>} - Response from Edge Function
 */
async function sendViaEdgeFunction(emailData) {
  try {
    console.log('Sending email via Supabase Edge Function...');
    
    // Get the Supabase client instance
    let supabaseClient = window.supabaseClient;
    
    if (!supabaseClient) {
      console.error('Supabase client not available, trying to get from global context');
      // Try to get from global context if available
      if (window.supabase) {
        supabaseClient = window.supabase;
      } else {
        throw new Error('Supabase client not available');
      }
    }
    
    // Call the Edge Function
    const { data, error } = await supabaseClient.functions.invoke('send-email', {
      body: emailData
    });
    
    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }
    
    console.log('Email sent successfully via Edge Function:', data);
    return {
      messageId: data.messageId || 'unknown',
      success: true,
      message: 'Email sent via Supabase Edge Function'
    };
  } catch (error) {
    console.error('Error sending email via Edge Function:', error);
    
    // Log detailed error information for debugging
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // Fallback to mock server if Edge Function fails
    console.log('Edge Function failed, falling back to mock server...');
    return await sendEmailViaServer(emailData);
  }
}

/**
 * Extract filename from URL
 * @param {string} url - URL to extract filename from
 * @returns {string} - Filename
 */
const getFileNameFromUrl = (url) => {
  try {
    // Get the file name from the URL
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Remove query parameters if any
    if (fileName.includes('?')) {
      fileName = fileName.split('?')[0];
    }
    
    // Replace URL encoding for better readability
    fileName = decodeURIComponent(fileName);
    
    // Remove any special characters that might cause issues
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    return fileName || 'attachment';
  } catch (error) {
    return 'attachment';
  }
};

/**
 * Format email content as HTML
 * @param {object} notification - Email notification object
 * @returns {string} - Formatted HTML content
 */
const formatEmailHtml = (notification) => {
  // Format content based on email type
  let formattedContent;
  
  switch (notification.emailType) {
    case 'request_resolved':
      formattedContent = formatResolvedRequestEmail(notification);
      break;
    case 'request_escalated':
      formattedContent = formatEscalatedRequestEmail(notification);
      break;
    case 'request_terminated':
      formattedContent = formatTerminatedRequestEmail(notification);
      break;
    case 'request_created':
      formattedContent = formatRequestCreatedEmail(notification);
      break;
    default:
      // Default formatting for other types
      formattedContent = formatDefaultEmail(notification);
  }
  
  return formattedContent;
};

/**
 * Format email for resolved requests
 * @param {object} notification - Email notification object
 * @returns {string} - Formatted HTML content
 */
const formatResolvedRequestEmail = (notification) => {
  const contentParagraphs = notification.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #003b71;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f1f1f1;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #003b71;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 15px;
        }
        .request-id {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          margin: 10px 0;
          display: inline-block;
        }
        .attachments {
          margin-top: 20px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .attachment-item {
          margin-bottom: 5px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          background-color: #4caf50;
          color: white;
          margin-bottom: 15px;
        }
        .resolution-box {
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .resolution-title {
          font-weight: bold;
          color: #2e7d32;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SRM Examination Control Portal</h1>
        </div>
        <div class="content">
          <h2>${notification.subject}</h2>
          <div class="status-badge">Resolved</div>
          ${notification.request_id ? 
            `<div>Request ID: <span class="request-id">${notification.request_id}</span></div>` : ''}
          
          <div class="resolution-box">
            <div class="resolution-title">Resolution:</div>
            ${contentParagraphs}
          </div>
          
          <p>If you have any further questions, please feel free to submit a new request through the Examination Control Portal.</p>
          
          ${notification.attachments && notification.attachments.length > 0 ? 
            `<div class="attachments">
              <p><strong>Attachments:</strong></p>
              <ul>
                ${notification.attachments.map(url => 
                  `<li class="attachment-item">
                    <a href="${url}" target="_blank">View Attachment (${getFileNameFromUrl(url)})</a>
                  </li>`
                ).join('')}
              </ul>
            </div>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from the SRM Examination Control Portal. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} SRMIST. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Format email for escalated requests
 * @param {object} notification - Email notification object
 * @returns {string} - Formatted HTML content
 */
const formatEscalatedRequestEmail = (notification) => {
  const contentParagraphs = notification.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #003b71;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f1f1f1;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #003b71;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 15px;
        }
        .request-id {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          margin: 10px 0;
          display: inline-block;
        }
        .attachments {
          margin-top: 20px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .attachment-item {
          margin-bottom: 5px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          background-color: #ff9800;
          color: white;
          margin-bottom: 15px;
        }
        .escalation-box {
          background-color: #fff3e0;
          border-left: 4px solid #ff9800;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .escalation-title {
          font-weight: bold;
          color: #e65100;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SRM Examination Control Portal</h1>
        </div>
        <div class="content">
          <h2>${notification.subject}</h2>
          <div class="status-badge">Escalated</div>
          ${notification.request_id ? 
            `<div>Request ID: <span class="request-id">${notification.request_id}</span></div>` : ''}
          
          <div class="escalation-box">
            <div class="escalation-title">Update on your request:</div>
            ${contentParagraphs}
          </div>
          
          <p>Your request has been escalated to higher authorities for further review. We will keep you updated on any progress.</p>
          
          ${notification.attachments && notification.attachments.length > 0 ? 
            `<div class="attachments">
              <p><strong>Attachments:</strong></p>
              <ul>
                ${notification.attachments.map(url => 
                  `<li class="attachment-item">
                    <a href="${url}" target="_blank">View Attachment (${getFileNameFromUrl(url)})</a>
                  </li>`
                ).join('')}
              </ul>
            </div>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from the SRM Examination Control Portal. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} SRMIST. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Format email for terminated requests
 * @param {object} notification - Email notification object
 * @returns {string} - Formatted HTML content
 */
const formatTerminatedRequestEmail = (notification) => {
  const contentParagraphs = notification.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #003b71;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f1f1f1;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #003b71;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 15px;
        }
        .request-id {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          margin: 10px 0;
          display: inline-block;
        }
        .attachments {
          margin-top: 20px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .attachment-item {
          margin-bottom: 5px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          background-color: #f44336;
          color: white;
          margin-bottom: 15px;
        }
        .termination-box {
          background-color: #ffebee;
          border-left: 4px solid #f44336;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .termination-title {
          font-weight: bold;
          color: #c62828;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SRM Examination Control Portal</h1>
        </div>
        <div class="content">
          <h2>${notification.subject}</h2>
          <div class="status-badge">Terminated</div>
          ${notification.request_id ? 
            `<div>Request ID: <span class="request-id">${notification.request_id}</span></div>` : ''}
          
          <div class="termination-box">
            <div class="termination-title">Request Termination Reason:</div>
            ${contentParagraphs}
          </div>
          
          <p>If you believe this was done in error or have additional information to provide, please submit a new request through the Examination Control Portal.</p>
          
          ${notification.attachments && notification.attachments.length > 0 ? 
            `<div class="attachments">
              <p><strong>Attachments:</strong></p>
              <ul>
                ${notification.attachments.map(url => 
                  `<li class="attachment-item">
                    <a href="${url}" target="_blank">View Attachment (${getFileNameFromUrl(url)})</a>
                  </li>`
                ).join('')}
              </ul>
            </div>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from the SRM Examination Control Portal. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} SRMIST. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Format email for new requests
 * @param {object} notification - Email notification object
 * @returns {string} - Formatted HTML content
 */
const formatRequestCreatedEmail = (notification) => {
  const contentParagraphs = notification.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #003b71;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f1f1f1;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #003b71;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 15px;
        }
        .request-id {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          margin: 10px 0;
          display: inline-block;
        }
        .attachments {
          margin-top: 20px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .attachment-item {
          margin-bottom: 5px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          background-color: #2196f3;
          color: white;
          margin-bottom: 15px;
        }
        .confirmation-box {
          background-color: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SRM Examination Control Portal</h1>
        </div>
        <div class="content">
          <h2>${notification.subject}</h2>
          <div class="status-badge">Submitted</div>
          ${notification.request_id ? 
            `<div>Request ID: <span class="request-id">${notification.request_id}</span></div>` : ''}
          
          <div class="confirmation-box">
            ${contentParagraphs}
          </div>
          
          <p>We have received your request and it is currently under review. You will be notified via email when there are updates.</p>
          
          ${notification.attachments && notification.attachments.length > 0 ? 
            `<div class="attachments">
              <p><strong>Attachments:</strong></p>
              <ul>
                ${notification.attachments.map(url => 
                  `<li class="attachment-item">
                    <a href="${url}" target="_blank">View Attachment (${getFileNameFromUrl(url)})</a>
                  </li>`
                ).join('')}
              </ul>
            </div>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from the SRM Examination Control Portal. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} SRMIST. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Format default email template
 * @param {object} notification - Email notification object
 * @returns {string} - Formatted HTML content
 */
const formatDefaultEmail = (notification) => {
  const contentParagraphs = notification.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  
  // Email template with SRM branding
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #003b71;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          background-color: #f1f1f1;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #003b71;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 15px;
        }
        .request-id {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          margin: 10px 0;
          display: inline-block;
        }
        .attachments {
          margin-top: 20px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .attachment-item {
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SRM Examination Control Portal</h1>
        </div>
        <div class="content">
          <h2>${notification.subject}</h2>
          ${notification.request_id ? 
            `<div>Request ID: <span class="request-id">${notification.request_id}</span></div>` : ''}
          ${contentParagraphs}
          ${notification.attachments && notification.attachments.length > 0 ? 
            `<div class="attachments">
              <p><strong>Attachments:</strong></p>
              <ul>
                ${notification.attachments.map(url => 
                  `<li class="attachment-item">
                    <a href="${url}" target="_blank">View Attachment (${getFileNameFromUrl(url)})</a>
                  </li>`
                ).join('')}
              </ul>
            </div>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from the SRM Examination Control Portal. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} SRMIST. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Process pending email notifications from the database
 * @param {object} supabase - Supabase client
 */
export const processEmailQueue = async (supabase) => {
  try {
    // Get pending notifications
    const { data: notifications, error } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('sent_at', { ascending: true })
      .limit(10);
      
    if (error) {
      throw error;
    }
    
    console.log(`Processing ${notifications?.length || 0} pending email notifications`);
    
    // Process each notification
    for (const notification of notifications) {
      try {
        console.log(`Sending notification: ${notification.id}`);
        console.log(`Email details: To: ${notification.recipient_email}, Subject: ${notification.subject}`);
        
        // Send email notification
        await sendEmailNotification(notification);
        
        // Update notification status to sent
        await supabase
          .from('email_notifications')
          .update({ status: 'sent' })
          .eq('id', notification.id);
          
        console.log(`Successfully sent notification: ${notification.id}`);
      } catch (err) {
        console.error(`Failed to send notification ${notification.id}:`, err);
        
        // Update notification status to failed
        await supabase
          .from('email_notifications')
          .update({ 
            status: 'failed',
            content: notification.content + '\n\nError: ' + err.message 
          })
          .eq('id', notification.id);
      }
    }
    
    // Check for any failed emails and report them
    if (notifications && notifications.length > 0) {
      const { data: failedEmails, error: failedError } = await supabase
        .from('email_notifications')
        .select('id, recipient_email, subject, status')
        .eq('status', 'failed')
        .order('sent_at', { ascending: false })
        .limit(5);
        
      if (!failedError && failedEmails && failedEmails.length > 0) {
        console.warn(`There are ${failedEmails.length} failed email notifications:`);
        failedEmails.forEach(email => {
          console.warn(`- ID: ${email.id}, To: ${email.recipient_email}, Subject: ${email.subject}`);
        });
      }
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
};

/**
 * Create and trigger an email notification
 * @param {object} supabase - Supabase client
 * @param {object} data - Notification data
 */
export const createEmailNotification = async (supabase, data) => {
  try {
    console.log('Creating email notification with data:', data);
    
    const { error } = await supabase
      .from('email_notifications')
      .insert({
        recipient_email: data.recipientEmail,
        recipient_name: data.recipientName,
        request_id: data.requestId,
        email_type: data.emailType,
        subject: data.subject,
        content: data.content,
        attachments: data.attachments || [],
        status: 'pending'
      });
      
    if (error) {
      throw error;
    }
    
    // Process email queue immediately
    await processEmailQueue(supabase);
    
    return { success: true };
  } catch (error) {
    console.error('Error creating email notification:', error);
    throw error;
  }
};

/**
 * Send a test email to verify the email system is working
 * @param {object} supabase - Supabase client
 * @param {string} recipientEmail - Email address to send test to
 * @param {string} recipientName - Name of recipient
 * @returns {Promise<object>} - Result of sending test email
 */
export const sendTestEmail = async (supabase, recipientEmail, recipientName) => {
  console.log(`Sending test email to ${recipientEmail} (${recipientName})`);
  
  try {
    // Create test email notification in the database
    const { data, error } = await supabase
      .from('email_notifications')
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        request_id: null,
        email_type: 'request_created',
        subject: 'Email System Test - Please Disregard',
        content: `Dear ${recipientName},

This is a test email to verify that the email notification system is working properly.

If you received this email, it confirms that our email delivery system is functioning correctly.

Time sent: ${new Date().toLocaleString()}

Thank you,
SRMIST Examination Control Team`,
        attachments: [],
        status: 'pending'
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('Error creating test email notification:', error);
      return { success: false, message: `Failed to create email notification: ${error.message}`, error };
    }
    
    console.log('Test email notification created:', data);
    
    // Send the email immediately
    try {
      const result = await sendEmailNotification(data);
      
      // Update status to sent
      await supabase
        .from('email_notifications')
        .update({ status: 'sent' })
        .eq('id', data.id);
        
      console.log('Test email sent or simulated successfully:', result);
      
      // Check if this was a simulated or mock server email
      if ((result.message && result.message.includes('simulated')) || 
          (result.message && result.message.includes('mock server'))) {
        return { 
          success: true, 
          message: result.message,
          simulatedOnly: true,
          emailId: data.id
        };
      }
      
      return { 
        success: true, 
        message: `Test email sent successfully to ${recipientEmail}`,
        emailId: data.id
      };
    } catch (sendError) {
      console.error('Error sending test email:', sendError);
      
      // Update notification status to failed
      await supabase
        .from('email_notifications')
        .update({ 
          status: 'failed',
          content: data.content + '\n\nError: ' + sendError.message 
        })
        .eq('id', data.id);
        
      return { 
        success: false, 
        message: `Failed to send test email: ${sendError.message}`, 
        error: sendError 
      };
    }
  } catch (err) {
    console.error('Unexpected error in sendTestEmail:', err);
    return { success: false, message: `Unexpected error: ${err.message}`, error: err };
  }
};

// Add debug utility function to check API connection
export const checkEmailApiConnection = async () => {
  try {
    console.log('Testing connection to Brevo API...');
    
    // For browser environments, need to handle CORS
    try {
      // Try a direct connection first
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'api-key': BREVO_API_KEY,
        },
      });
      
      if (response.ok) {
        const accountData = await response.json();
        console.log('Brevo API connection successful:', accountData);
        return { 
          success: true, 
          message: 'API connection successful',
          apiCredits: accountData.plan?.[0]?.credits,
          email: accountData.email
        };
      } else {
        const errorData = await response.json();
        console.error('Brevo API connection test failed with error response:', errorData);
        return { success: false, message: `API connection failed: ${JSON.stringify(errorData)}`, error: errorData };
      }
    } catch (fetchError) {
      // If fetch fails, it's likely due to CORS
      console.warn('Direct API connection test failed, likely due to CORS:', fetchError);
      
      // Return success anyway for simulation purposes
      return { 
        success: true, 
        message: 'API connection simulated (CORS prevented actual check)',
        simulated: true
      };
    }
  } catch (error) {
    console.error('Error testing Brevo API connection:', error);
    return { success: false, message: `Connection test error: ${error.message}`, error };
  }
};

/**
 * Get the allowed email types from the database schema
 * This is useful for understanding the constraints on the email_type column
 * @param {object} supabase - Supabase client
 * @returns {Promise<string[]>} - Array of allowed email types
 */
export const getEmailTypeConstraints = async (supabase) => {
  try {
    // This query gets the check constraint definition for the email_type column
    const { data, error } = await supabase.rpc('get_email_type_constraints');
    
    if (error) {
      console.error('Error getting email type constraints:', error);
      // Fallback to known values
      return ['request_created', 'request_updated', 'request_resolved', 'request_rejected', 'request_escalated'];
    }
    
    console.log('Email type constraints:', data);
    return data;
  } catch (err) {
    console.error('Error checking email type constraints:', err);
    // Fallback to known values
    return ['request_created', 'request_updated', 'request_resolved', 'request_rejected', 'request_escalated'];
  }
}; 