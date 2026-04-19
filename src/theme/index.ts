export type Theme = {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  muted: string
  success: string
  danger: string
  warning: string
  companyName: string
  logoUrl: string | null
}

export const GARUDA_BLUE: Theme = {
  primary: '#1e3a5f',
  secondary: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  companyName: 'Garuda People',
  logoUrl: null,
}

export function themeFromPublicSettings(s: Record<string, string>): Theme {
  return {
    ...GARUDA_BLUE,
    primary: s.company_primary_color || s.login_bg_color || GARUDA_BLUE.primary,
    secondary: s.company_secondary_color || GARUDA_BLUE.secondary,
    companyName: s.company_name || GARUDA_BLUE.companyName,
    logoUrl: s.company_logo || null,
  }
}
