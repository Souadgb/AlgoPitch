const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-20 w-20 text-3xl',
}

export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-inner ${SIZES[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
