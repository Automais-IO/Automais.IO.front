/** Lê claim must_chpwd do JWT (payload sem validar assinatura — só UX; API valida). */
export function jwtRequiresPasswordChange(token) {
  if (!token || typeof token !== 'string') return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(json)
    return payload.must_chpwd === 'true'
  } catch {
    return false
  }
}
