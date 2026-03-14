// Configuração do Tenant
// Obtém o tenantId do usuário logado através do contexto de autenticação

export const getTenantId = () => {
  // Primeiro, tentar obter do usuário salvo (fonte mais confiável)
  try {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      if (user?.tenantId || user?.TenantId) {
        const tenantId = user.tenantId || user.TenantId
        // Garantir que o localStorage está sincronizado
        const storedTenantId = localStorage.getItem('tenantId')
        if (storedTenantId !== tenantId) {
          console.log('🔄 Sincronizando tenantId no localStorage:', tenantId)
          setTenantId(tenantId)
        }
        return tenantId
      }
    }
  } catch (error) {
    console.error('Erro ao obter tenantId do usuário:', error)
  }

  // Se não tiver no usuário, tentar obter do localStorage (fallback)
  const storedTenantId = localStorage.getItem('tenantId')
  if (storedTenantId) {
    console.warn('⚠️ Usando tenantId do localStorage (usuário não encontrado):', storedTenantId)
    return storedTenantId
  }
  
  // Fallback: null se não houver usuário logado
  console.error('❌ tenantId não encontrado! Verifique se o usuário está logado.')
  return null
}

export const setTenantId = (tenantId) => {
  localStorage.setItem('tenantId', tenantId)
}

