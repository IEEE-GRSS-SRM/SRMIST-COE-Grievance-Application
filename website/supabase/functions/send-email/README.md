# Send Email Edge Function

This Supabase Edge Function handles sending emails via the Brevo API.

## Deployment

The function can be deployed using the Supabase CLI:

```bash
# From the project root
npx supabase functions deploy send-email
```

## Environment Variables

This function requires the following environment variable:

- `BREVO_API_KEY`: Your Brevo API key

You can set it using:

```bash
npx supabase secrets set BREVO_API_KEY=your-api-key
```

## API Usage

The function expects a POST request with the following JSON body:

```json
{
  "to": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "subject": "Email Subject",
  "htmlContent": "<p>Email content in HTML format</p>",
  "attachment": [
    {
      "url": "https://example.com/file.pdf",
      "name": "file.pdf"
    }
  ]
}
```

The `attachment` field is optional.

## Response

The function returns a JSON response with the following structure:

```json
{
  "success": true,
  "messageId": "message-id-from-brevo",
  "message": "Email sent successfully"
}
```

Or in case of an error:

```json
{
  "error": "Error message",
  "details": "Error details"
}
```

## Testing

You can test the function using:

```bash
npx supabase functions invoke send-email --body '{"to":[{"email":"test@example.com","name":"Test User"}],"subject":"Test Email","htmlContent":"<p>This is a test email</p>"}'
``` 