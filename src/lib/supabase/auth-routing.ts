export const PROTECTED_PATHS = ["/dashboard", "/library", "/upload"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getRedirectTarget(pathname: string, hasUser: boolean): string | null {
  if (!hasUser && isProtectedPath(pathname)) {
    const encoded = encodeURIComponent(pathname);
    return `/sign-in?next=${encoded}`;
  }

  if (hasUser && pathname === "/sign-in") {
    return "/dashboard";
  }

  return null;
}
