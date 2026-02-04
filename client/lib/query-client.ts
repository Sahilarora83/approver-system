import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  const protocol = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("10.0.2.2") || host.startsWith("192.168.")
    ? "http"
    : "https";

  // Ensure we don't have trailing slashes
  const url = `${protocol}://${host}`.replace(/\/$/, "");
  console.log(`[API URL] Requesting: ${url}`);
  return url;
}

/**
 * Resolves a potentially relative image path or a localhost URL into an absolute URI
 * suitable for React Native's Image component.
 */
export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return "";

  // If it's already a full URL or a local file/data URI, return as-is
  if (path.startsWith("http") || path.startsWith("file://") || path.startsWith("data:") || path.startsWith("content://")) {
    if (path.startsWith("http")) {
      // If it is a Supabase URL or any other external URL, return it directly.
      if (!path.includes("localhost") && !path.includes("127.0.0.1") && !path.includes("192.168.")) {
        return path;
      }

      const baseUrl = getApiUrl();
      const currentHost = baseUrl.split("://")[1];
      const protocol = baseUrl.split("://")[0];

      // Fix localhost URLs only if we are in production but the DB has local URLs
      if (/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/.test(path)) {
        return path.replace(/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/g, `${protocol}://${currentHost}`);
      }
    }
    return path;
  }

  // If it's a relative path
  const baseUrl = getApiUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;

  const reqHeaders: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  // Attach X-User-Id as a fallback for sessions
  const storedUser = await AsyncStorage.getItem("user");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.id) {
        reqHeaders["X-User-Id"] = parsed.id;
      }
    } catch (e) { }
  }

  // console.log(`[API Request] ${method} ${url} | Headers:`, JSON.stringify(reqHeaders));

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    console.log(`[API Error] ${method} ${url} failed:`, error.message);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const route = queryKey.join("/");
      const url = `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;

      const reqHeaders: Record<string, string> = {};

      // Attach X-User-Id as a fallback for sessions
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.id) {
            reqHeaders["X-User-Id"] = parsed.id;
          }
        } catch (e) {
          console.log("[Query Function] Failed to parse user for header:", e);
        }
      }

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: reqHeaders,
          credentials: "include",
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);
        return await res.json();
      } catch (error: any) {
        console.log(`[Query Error] GET ${url} failed:`, error.message);
        throw error;
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes (prevents constant refetching)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
