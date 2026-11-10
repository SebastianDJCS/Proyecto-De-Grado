import unMark from '../../assets/brand/un-mark.png';

const SIZES = {
  sm: {
    mark: 'h-7',
    word: 'text-lg',
    sub: 'text-[8px]',
    gap: 'gap-1.5',
    stack: 'mt-1.5 gap-0.5',
  },
  md: {
    mark: 'h-9',
    word: 'text-xl',
    sub: 'text-[9px]',
    gap: 'gap-2',
    stack: 'mt-2 gap-0.5',
  },
  lg: {
    mark: 'h-14',
    word: 'text-3xl',
    sub: 'text-[11px]',
    gap: 'gap-2.5',
    stack: 'mt-3 gap-1',
  },
};

const NOMBRE = 'Corporación Universitaria Rafael Núñez';
const VIGILADA = 'Vigilada Mineducación';

function MarcaUN({ size, className = '' }) {
  return (
    <img
      src={unMark}
      alt=""
      aria-hidden="true"
      className={`${SIZES[size].mark} w-auto shrink-0 object-contain ${className}`}
    />
  );
}

function BloqueHorizontal({ size, inverse }) {
  const s = SIZES[size];
  const colorNombre = inverse ? 'text-white' : 'text-un-teal';
  const colorSecundario = inverse ? 'text-white/85' : 'text-un-teal';

  return (
    <div className={`flex min-w-0 items-center ${s.gap}`}>
      <MarcaUN size={size} />
      <div className="min-w-0">
        <p
          className={`${s.word} font-extrabold leading-none tracking-[-0.035em] ${
            inverse ? 'text-white' : 'text-ink'
          }`}
        >
          INÚÑEZ
        </p>
        <p className={`${s.sub} mt-1 font-semibold leading-tight ${colorNombre}`}>{NOMBRE}</p>
        <p className={`${s.sub} font-medium leading-tight ${colorSecundario} opacity-80`}>
          {VIGILADA}
        </p>
      </div>
    </div>
  );
}

function BloqueVertical({ size }) {
  const s = SIZES[size];

  return (
    <div className="flex flex-col items-center text-center">
      <MarcaUN size={size} />
      <div className={`flex flex-col ${s.stack}`}>
        <p className={`${s.sub} font-semibold leading-tight text-un-teal`}>
          Corporación Universitaria
        </p>
        <p className={`${s.word} font-extrabold leading-none tracking-[-0.02em] text-un-teal`}>
          Rafael Núñez
        </p>
        <p className={`${s.sub} font-medium text-un-teal/80`}>{VIGILADA}</p>
      </div>
    </div>
  );
}

export default function Logo({ variant = 'mark', size = 'md', className = '' }) {
  const label = NOMBRE;

  if (variant === 'mark') {
    return (
      <span role="img" aria-label={label} className={`inline-flex ${className}`}>
        <MarcaUN size={size} />
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <span role="img" aria-label={label} className={`inline-flex ${className}`}>
        <BloqueVertical size={size} />
      </span>
    );
  }

  if (variant === 'reverse') {
    return (
      <span
        role="img"
        aria-label={label}
        className={`inline-flex rounded-sm bg-brand-600 p-1.5 ${className}`}
      >
        <MarcaUN size={size} />
      </span>
    );
  }

  if (variant === 'reverseHorizontal') {
    return (
      <span
        role="img"
        aria-label={label}
        className={`inline-flex rounded-sm bg-brand-600 px-3 py-2 ${className}`}
      >
        <BloqueHorizontal size={size} inverse />
      </span>
    );
  }

  return (
    <span role="img" aria-label={label} className={`inline-flex ${className}`}>
      <BloqueHorizontal size={size} />
    </span>
  );
}
