/**
 * URL and link formatting utilities for Altafawuq Online Academy.
 * Ensures robust public URLs across WhatsApp notifications, student registration links,
 * exam links, and mobile devices without hitting Google Cloud Run's private development 404 wall.
 */

const STORAGE_CUSTOM_URL_KEY = 'academy_custom_public_url';

/**
 * Returns true if current environment is running on an ephemeral dev container (ais-dev-*)
 */
export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

/**
 * Returns the current development URL (e.g. ais-dev-*.europe-west2.run.app)
 */
export function getDevAppUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/**
 * Returns the public shared preview URL (e.g. ais-pre-*.europe-west2.run.app)
 */
export function getSharedAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

/**
 * Retrieves the custom public URL configured by academy admin, if any
 */
export function getCustomPublicUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_CUSTOM_URL_KEY) || '';
}

/**
 * Persists a custom public URL for the academy
 */
export function saveCustomPublicUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = (url || '').trim().replace(/\/+$/, '');
  if (clean) {
    localStorage.setItem(STORAGE_CUSTOM_URL_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
  }
}

/**
 * Returns the absolute best public URL that students, parents, and mobile browsers can open.
 * - Prioritizes custom public domain if configured in Settings.
 * - Automatically transforms 'ais-dev-' to 'ais-pre-' so mobile links never show 404.
 */
export function getPublicShareableBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  
  const custom = getCustomPublicUrl();
  if (custom) {
    return custom;
  }

  const origin = window.location.origin;
  // Google AI Studio dev containers (ais-dev-*) require active developer authentication and cookies.
  // When opened on a mobile device or sent via WhatsApp, Cloud Run returns 404 Page Not Found.
  // The shared preview container (ais-pre-*) is the designated public endpoint.
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }

  return origin;
}

/**
 * Generates a direct student registration link for new student enrollment
 */
export function getRegistrationLink(): string {
  const base = getPublicShareableBaseUrl();
  return `${base}/?view=register`;
}

/**
 * Generates a direct public link for an online exam
 */
export function getExamLink(examId: string): string {
  const base = getPublicShareableBaseUrl();
  return `${base}/?exam=${encodeURIComponent(examId)}`;
}

/**
 * Generates a direct student portal link
 */
export function getStudentPortalLink(): string {
  const base = getPublicShareableBaseUrl();
  return `${base}/?view=student`;
}

/**
 * Generates a direct interactive whiteboard link
 */
export function getWhiteboardLink(params: {
  teacherId?: string;
  teacherName?: string;
  theme?: string;
  bg?: string;
} = {}): string {
  const base = getPublicShareableBaseUrl();
  const searchParams = new URLSearchParams();
  searchParams.set('view', 'whiteboard');
  if (params.teacherId) searchParams.set('teacherId', params.teacherId);
  if (params.teacherName) searchParams.set('teacherName', params.teacherName);
  if (params.theme) searchParams.set('theme', params.theme);
  if (params.bg) searchParams.set('bg', params.bg);
  return `${base}/?${searchParams.toString()}`;
}
