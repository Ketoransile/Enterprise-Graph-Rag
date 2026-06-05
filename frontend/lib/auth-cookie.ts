export const AUTH_COOKIE_NAME = "graphrag_token";
export const AUTH_REDIRECT_PARAM = "next";

export function getSafeRedirectPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
