const Logo = ({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: 28, md: 40, lg: 56 };
  const s = sizes[size];
  const textSizes = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={s} height={s} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="25" r="12" stroke="hsl(42, 50%, 57%)" strokeWidth="3" fill="none" />
        <circle cx="38" cy="25" r="12" stroke="hsl(42, 50%, 57%)" strokeWidth="3" fill="none" />
        <circle cx="30" cy="38" r="12" stroke="hsl(42, 50%, 57%)" strokeWidth="3" fill="none" />
      </svg>
      <span className={`font-display font-bold tracking-tight text-primary ${textSizes[size]}`}>
        Allo 360
      </span>
    </div>
  );
};

export default Logo;
