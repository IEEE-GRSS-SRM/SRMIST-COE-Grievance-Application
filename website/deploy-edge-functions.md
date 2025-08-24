# Deploying the Email Sending Edge Function

This guide explains how to deploy the Supabase Edge Function for sending emails in production.

## Option 1: Using the Batch File (Windows)

The easiest way to deploy is using the provided batch file:

1. Simply double-click the `deploy-edge-function.bat` file in the project root
2. Follow the prompts to log in, link your project, and deploy the function

## Option 2: Using npm Scripts

You can also use the npm scripts defined in package.json:

1. Log in to your Supabase account:
   ```bash
   npm run supabase:login
   ```

2. Link your project (you'll be prompted to enter your project reference):
   ```bash
   npm run supabase:link
   ```

3. Set the Brevo API key as a secret:
   ```bash
   npm run supabase:secret
   ```

4. Deploy the Edge Function:
   ```bash
   npm run supabase:deploy
   ```

## Option 3: Manual Deployment with npx

If you prefer to run commands manually:

1. Log in to your Supabase account:
   ```bash
   npx supabase login
   ```

2. Link your project (replace `<project-id>` with your actual Supabase project ID):
   ```bash
   npx supabase link --project-ref <project-id>
   ```

3. Set the Brevo API key as a secret:
   ```bash
   npx supabase secrets set BREVO_API_KEY=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
   ```

4. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy send-email
   ```

5. Verify the deployment:
   ```bash
   npx supabase functions list
   ```

## Finding Your Project Reference

Your Supabase project reference is in your project URL:
- If your project URL is `https://app.supabase.com/project/abcdefghijklm`, then your project reference is `abcdefghijklm`

## Testing the Edge Function

After deployment, you can test the Edge Function using the Supabase dashboard or with this command:

```bash
npx supabase functions invoke send-email --body '{"to":[{"email":"test@example.com","name":"Test User"}],"subject":"Test Email","htmlContent":"<p>This is a test email</p>"}'
```

## Troubleshooting

If you encounter issues:

1. Check the Edge Function logs:
   ```bash
   npx supabase functions logs send-email
   ```

2. Verify your Brevo API key is correctly set:
   ```bash
   npx supabase secrets list
   ```

3. Make sure CORS is properly configured if you're calling the function from a different domain.

## Production Configuration

In a production environment:

1. Make sure your frontend code is built with `NODE_ENV=production`
2. The `isProduction()` function in `serverProxy.js` will automatically detect production environments
3. The email service will use the Edge Function instead of the mock server

## Security Considerations

- Keep your API keys secure
- Consider rate limiting the Edge Function
- Monitor usage to prevent abuse 