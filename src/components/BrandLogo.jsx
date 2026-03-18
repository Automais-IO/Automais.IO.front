import automaisLogo from '../img/Automais_logo.png'

/**
 * Logo principal da marca (substitui texto + ícone).
 * @param {string} className - classes Tailwind (ex.: h-10 w-auto max-w-[200px])
 * @param {string} alt
 */
export default function BrandLogo({ className = 'h-10 w-auto max-w-[220px] object-contain', alt = 'Automais' }) {
  return <img src={automaisLogo} alt={alt} className={className} />
}
