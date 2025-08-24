// Test script for the Edge Function
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const SUPABASE_URL = 'https://xrwildhnakpfdkpjqzfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyd2lsZGhuYWtwZmRrcGpxemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NjE1MjYsImV4cCI6MjAzMzQzNzUyNn0.0UM6Kj4sTmGBNUYXCXkfBrHbWOOHc-kXcPwLXHVuFXc';

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test email data
const emailData = {
  to: [
    {
      email: "test@example.com",
      name: "Test User"
    }
  ],
  subject: "Test Email from Edge Function",
  htmlContent: "<p>This is a test email sent from the Edge Function</p>"
};

// Function to test the Edge Function
async function testEdgeFunction() {
  console.log('Testing Edge Function...');
  
  try {
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailData
    });
    
    if (error) {
      console.error('Error calling Edge Function:', error);
      return;
    }
    
    console.log('Edge Function response:', data);
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Exception when calling Edge Function:', error);
  }
}

// Run the test
testEdgeFunction(); 