import { motion } from "framer-motion";

export function NetworkNodes({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`} fill="none">
      {/* Central node */}
      <motion.circle
        cx="100"
        cy="100"
        r="12"
        className="fill-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />

      {/* Surrounding nodes */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const x = 100 + 50 * Math.cos((angle * Math.PI) / 180);
        const y = 100 + 50 * Math.sin((angle * Math.PI) / 180);
        return (
          <g key={i}>
            <motion.line
              x1="100"
              y1="100"
              x2={x}
              y2={y}
              className="stroke-primary/30"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            />
            <motion.circle
              cx={x}
              cy={y}
              r="8"
              className="fill-secondary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
            />
          </g>
        );
      })}

      {/* Outer ring nodes */}
      {[30, 90, 150, 210, 270, 330].map((angle, i) => {
        const x = 100 + 80 * Math.cos((angle * Math.PI) / 180);
        const y = 100 + 80 * Math.sin((angle * Math.PI) / 180);
        const innerX = 100 + 50 * Math.cos(((angle - 30) * Math.PI) / 180);
        const innerY = 100 + 50 * Math.sin(((angle - 30) * Math.PI) / 180);
        return (
          <g key={`outer-${i}`}>
            <motion.line
              x1={innerX}
              y1={innerY}
              x2={x}
              y2={y}
              className="stroke-primary/20"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
            />
            <motion.circle
              cx={x}
              cy={y}
              r="5"
              className="fill-primary/60"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 1 + i * 0.1 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function FloatingDots({ className = "" }: { className?: string }) {
  const dots = [
    { x: 20, y: 30, size: 6, delay: 0 },
    { x: 80, y: 20, size: 4, delay: 0.2 },
    { x: 60, y: 70, size: 8, delay: 0.4 },
    { x: 30, y: 80, size: 5, delay: 0.6 },
    { x: 90, y: 60, size: 6, delay: 0.3 },
    { x: 45, y: 45, size: 10, delay: 0.5 },
  ];

  return (
    <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
      {dots.map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={dot.size}
          className="fill-secondary/40"
          initial={{ scale: 0 }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 3,
            delay: dot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}

export function ConnectionLines({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 200" className={`w-full h-full ${className}`} fill="none">
      {/* Flowing connection lines */}
      <motion.path
        d="M0 100 Q75 50 150 100 T300 100"
        className="stroke-primary/20"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.path
        d="M0 120 Q75 170 150 120 T300 120"
        className="stroke-secondary/30"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
      />

      {/* Connection points */}
      {[50, 150, 250].map((x, i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={100 + (i % 2 === 0 ? 0 : 20)}
          r="6"
          className="fill-primary"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.2 }}
        />
      ))}
    </svg>
  );
}

export function HexagonNetwork({ className = "" }: { className?: string }) {
  const hexPoints = (cx: number, cy: number, size: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return points.join(" ");
  };

  return (
    <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`} fill="none">
      {/* Central hexagon */}
      <motion.polygon
        points={hexPoints(100, 100, 30)}
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Surrounding hexagons */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const x = 100 + 55 * Math.cos((angle * Math.PI) / 180);
        const y = 100 + 55 * Math.sin((angle * Math.PI) / 180);
        return (
          <motion.polygon
            key={i}
            points={hexPoints(x, y, 20)}
            className="fill-secondary/10 stroke-secondary/40"
            strokeWidth="1.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
          />
        );
      })}

      {/* Connection dots */}
      <motion.circle
        cx="100"
        cy="100"
        r="8"
        className="fill-primary"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
}

export function PeopleCircle({ className = "" }: { className?: string }) {
  const people = 8;

  return (
    <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`} fill="none">
      {/* Center connection hub */}
      <motion.circle
        cx="100"
        cy="100"
        r="25"
        className="fill-primary/10 stroke-primary/30"
        strokeWidth="2"
        strokeDasharray="4 4"
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: 360 }}
        transition={{
          scale: { duration: 0.5 },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
      />

      {/* People icons around the circle */}
      {Array.from({ length: people }).map((_, i) => {
        const angle = (360 / people) * i;
        const x = 100 + 65 * Math.cos((angle * Math.PI) / 180);
        const y = 100 + 65 * Math.sin((angle * Math.PI) / 180);

        return (
          <g key={i}>
            {/* Connection line */}
            <motion.line
              x1="100"
              y1="100"
              x2={x}
              y2={y}
              className="stroke-primary/20"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />

            {/* Person head */}
            <motion.circle
              cx={x}
              cy={y - 5}
              r="8"
              className={i % 2 === 0 ? "fill-primary" : "fill-secondary"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
            />

            {/* Person body */}
            <motion.ellipse
              cx={x}
              cy={y + 10}
              rx="10"
              ry="6"
              className={i % 2 === 0 ? "fill-primary/60" : "fill-secondary/60"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function GrowthChart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={`w-full h-full ${className}`} fill="none">
      {/* Grid lines */}
      {[30, 60, 90, 120].map((y, i) => (
        <line
          key={i}
          x1="20"
          y1={y}
          x2="180"
          y2={y}
          className="stroke-muted-foreground/10"
          strokeWidth="1"
        />
      ))}

      {/* Growth area */}
      <path
        d="M20 120 Q50 100 80 90 T140 50 T180 30 V120 H20 Z"
        className="fill-primary/10"
      />

      {/* Growth line */}
      <motion.path
        d="M20 120 Q50 100 80 90 T140 50 T180 30"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Data points */}
      {[
        { x: 20, y: 120 },
        { x: 60, y: 95 },
        { x: 100, y: 70 },
        { x: 140, y: 50 },
        { x: 180, y: 30 },
      ].map((point, i) => (
        <motion.circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="5"
          className="fill-secondary stroke-primary"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.2 }}
        />
      ))}
    </svg>
  );
}

export function DecorativeBlob({
  className = "",
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const colorClass = variant === "primary" ? "fill-primary/5" : "fill-secondary/10";

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={`w-full h-full ${className}`}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Forma fija. Animar el atributo `d` con fotogramas clave dejaba en
          cada carga de /plataforma el error «<path> attribute d: Expected
          moveto… "undefined"»; sin esa animación, desaparece. La entrada del
          <svg> (escala de 0,8 a 1) queda como único movimiento. */}
      <path
        d="M100 20 C150 20 180 50 180 100 C180 150 150 180 100 180 C50 180 20 150 20 100 C20 50 50 20 100 20"
        className={colorClass}
      />
    </motion.svg>
  );
}
