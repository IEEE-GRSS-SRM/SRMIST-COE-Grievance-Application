@echo off
echo ===== Deploying Supabase Edge Function =====
echo.

echo Step 1: Logging in to Supabase...
call npx supabase login
if %ERRORLEVEL% neq 0 (
    echo Error logging in to Supabase
    exit /b %ERRORLEVEL%
)
echo.

echo Step 2: Linking to your Supabase project...
echo Enter your Supabase project reference (found in your project URL):
set /p PROJECT_REF=
call npx supabase link --project-ref %PROJECT_REF%
if %ERRORLEVEL% neq 0 (
    echo Error linking to Supabase project
    exit /b %ERRORLEVEL%
)
echo.

echo Step 3: Setting Brevo API key as a secret...
call npx supabase secrets set BREVO_API_KEY=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
if %ERRORLEVEL% neq 0 (
    echo Error setting secret
    exit /b %ERRORLEVEL%
)
echo.

echo Step 4: Deploying the send-email function...
call npx supabase functions deploy send-email
if %ERRORLEVEL% neq 0 (
    echo Error deploying function
    exit /b %ERRORLEVEL%
)
echo.

echo Step 5: Verifying deployment...
call npx supabase functions list
echo.

echo ===== Deployment Complete! =====
echo Your Edge Function is now ready to use.
echo.

pause 