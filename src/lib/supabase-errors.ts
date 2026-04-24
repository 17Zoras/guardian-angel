export const getSupabaseErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback;
  }

  const maybeError = error as { code?: string; message?: string };

  if (maybeError.code === "42P01") {
    return "Database tables are missing. Run the Supabase migration, then refresh the app.";
  }

  return maybeError.message || fallback;
};
