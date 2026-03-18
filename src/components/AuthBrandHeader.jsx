import BrandLogo from './BrandLogo'

/** Logo 5em + IoT Platform (cinza chumbo), alinhado à direita com a borda da marca */
export default function AuthBrandHeader() {
  return (
    <div className="flex flex-col items-end w-fit mx-auto px-2">
      <BrandLogo
        className="h-[5em] w-auto max-w-[min(100%,380px)] object-contain object-right"
        alt="Automais"
      />
      <span className="mt-2 text-[11px] sm:text-xs font-medium tracking-wide text-[#454a54]">
        IoT Platform
      </span>
    </div>
  )
}
