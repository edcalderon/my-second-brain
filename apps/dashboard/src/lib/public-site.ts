const defaultSiteOrigin = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://edcalderon.io";
export const DASHBOARD_BASE_PATH = (process.env.NEXT_PUBLIC_DASHBOARD_BASE_PATH || (process.env.NODE_ENV === "development" ? "" : "/my-second-brain")).replace(/\/+$/, "");

function getSiteOrigin() {
    return (process.env.NEXT_PUBLIC_SITE_ORIGIN || defaultSiteOrigin).replace(/\/+$/, "");
}

export function dashboardPath(path = "/") {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    if (!DASHBOARD_BASE_PATH) {
        return normalizedPath;
    }

    if (normalizedPath === "/") {
        return `${DASHBOARD_BASE_PATH}/`;
    }

    return `${DASHBOARD_BASE_PATH}${normalizedPath}`;
}

export function dashboardHref(path = "/") {
    return path.startsWith("/") ? path : `/${path}`;
}

export function stripDashboardBasePath(pathname = "/") {
    if (!DASHBOARD_BASE_PATH) {
        return pathname || "/";
    }

    if (pathname === DASHBOARD_BASE_PATH || pathname === `${DASHBOARD_BASE_PATH}/`) {
        return "/";
    }

    if (pathname.startsWith(`${DASHBOARD_BASE_PATH}/`)) {
        return pathname.slice(DASHBOARD_BASE_PATH.length) || "/";
    }

    return pathname || "/";
}

export function publicSiteUrl(path = "/") {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const devPath = process.env.NODE_ENV === "development" && normalizedPath === "/"
        ? "/index.html"
        : normalizedPath;
    return new URL(devPath, `${getSiteOrigin()}/`).toString();
}
