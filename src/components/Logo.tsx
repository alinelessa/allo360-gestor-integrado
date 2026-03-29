const Logo = ({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizes = { sm: 28, md: 40, lg: 56 };
  const s = sizes[size];

  const textSizes = {
    sm: {
      title: "text-sm",
      subtitle: "text-[9px]",
    },
    md: {
      title: "text-lg",
      subtitle: "text-[10px]",
    },
    lg: {
      title: "text-2xl",
      subtitle: "text-xs",
    },
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="app-card-soft flex items-center justify-center rounded-2xl p-2">
        <svg
          width={s}
          height={s}
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="22"
            cy="25"
            r="12"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="38"
            cy="25"
            r="12"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="30"
            cy="38"
            r="12"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      <div className="leading-none">
        <p
          className={`font-semibold tracking-[0.08em] text-foreground ${textSizes[size].title}`}
        >
          ALLO 360
        </p>
        <p
          className={`app-faint mt-1 uppercase tracking-[0.18em] ${textSizes[size].subtitle}`}
        >
          Gestão integrada
        </p>
      </div>
    </div>
  );
};

export default Logo;