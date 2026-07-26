import Image from 'next/image'

interface HelixBrandProps {
  compact?: boolean
  className?: string
  markClassName?: string
  showTagline?: boolean
}

export function HelixBrand({ compact = false, className = '', markClassName = '', showTagline = true }: HelixBrandProps) {
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <Image
        src="/brand/helix-mark.svg"
        alt="Helix"
        width={compact ? 25 : 30}
        height={compact ? 29 : 34}
        priority
        className={`shrink-0 object-contain ${compact ? 'h-7 w-6' : 'h-8 w-7'} ${markClassName}`}
      />
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="font-sans text-sm font-bold tracking-[0.28em] text-primary">HELIX</div>
          {showTagline && <div className="mt-1 font-sans text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Functional AI</div>}
        </div>
      )}
    </div>
  )
}
