#!/bin/bash

# Deploy the create-public-booking Edge Function with JWT verification disabled
# This script ensures the function can be called by both authenticated and unauthenticated users

echo "🚀 Deploying create-public-booking Edge Function..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase."
    echo "   Run: supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy create-public-booking --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed create-public-booking Edge Function!"
    echo ""
    echo "The function is now accessible without authentication."
    echo "Both logged-in and logged-out users can submit booking requests."
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
