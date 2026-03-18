import automaisLogo from '../img/Automais_logo.png'

/**
 * Logo principal da marca (substitui texto + ícone).
 * @param {string} className - classes Tailwind (ex.: h-10 w-auto max-w-[200px])
 * @param {string} alt
 */
export default function BrandLogo({
  className = 'h-16 w-auto max-w-[min(100%,360px)] object-contain object-center',
  alt = 'Automais',
}) {
  return <img src={automaisLogo} alt={alt} className={className} />
}
