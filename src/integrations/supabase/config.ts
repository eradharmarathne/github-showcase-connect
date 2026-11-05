// Public connection settings. Fallbacks keep the published site working when
// build-time env vars are missing (the anon key is public by design).
const FALLBACK_URL = "https://takovelbhvoqnvfmnhaq.supabase.co";
const FALLBACK_ANON_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRha292ZWxiaHZvcW52Zm1uaGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTI3ODIsImV4cCI6MjA3NDUyODc4Mn0.mdjZEr41VD_GKYNjnUjY5RyjPUxrcr4uXfGaz9DH39E";

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY: string =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	FALLBACK_ANON_KEY;
