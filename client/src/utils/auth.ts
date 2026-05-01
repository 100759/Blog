const TOKEN_KEY = 'rin_auth_token';

// In-memory fallback for environments without localStorage (e.g., tests)
let memoryToken: string | null = null;

function getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const cookie of cookies) {
        const [rawKey, ...rawValue] = cookie.trim().split('=');
        if (rawKey === name) {
            return decodeURIComponent(rawValue.join('='));
        }
    }

    return null;
}

function isLocalStorageAvailable(): boolean {
    try {
        if (typeof localStorage === 'undefined') {
            return false;
        }
        // Test localStorage
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        return true;
    } catch {
        return false;
    }
}

export function getAuthToken(): string | null {
    if (isLocalStorageAvailable()) {
        return localStorage.getItem(TOKEN_KEY) || getCookieValue('auth_token');
    }
    return memoryToken || getCookieValue('auth_token');
}

export function setAuthToken(token: string): void {
    if (isLocalStorageAvailable()) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        memoryToken = token;
    }
}

export function removeAuthToken(): void {
    if (isLocalStorageAvailable()) {
        localStorage.removeItem(TOKEN_KEY);
    } else {
        memoryToken = null;
    }
}

export function headersWithAuth(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}
