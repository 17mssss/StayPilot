import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";

export const Component = () => {
  const [count, setCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.5;
  const speedY = 0.5;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % 40);
    gridOffsetY.set((currentY + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full overflow-hidden rounded-xl border border-border bg-background p-8 md:p-12 min-h-[400px] flex items-center justify-center"
    >
      {/* Base grid layer */}
      <div className="absolute inset-0 opacity-30">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      {/* Active grid layer - follows mouse */}
      <motion.div
        className="absolute inset-0 opacity-100"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      {/* Radial gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            The Infinite Grid
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Move your cursor to reveal the active grid layer.{" "}
            The pattern scrolls infinitely in the background.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setCount(count + 1)}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-all shadow-md active:scale-95"
          >
            Interact ({count})
          </button>
          <button className="px-8 py-3 border border-border text-foreground font-semibold rounded-md hover:bg-accent transition-all">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
};

const GridPattern = ({
  offsetX,
  offsetY,
}: {
  offsetX: any;
  offsetY: any;
}) => {
  return (
    <motion.svg
      className="absolute inset-0 h-full w-full"
      style={{ x: offsetX, y: offsetY }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/40"
          />
        </pattern>
      </defs>
      <rect
        x="-40"
        y="-40"
        width="calc(100% + 80px)"
        height="calc(100% + 80px)"
        fill="url(#grid-pattern)"
      />
    </motion.svg>
  );
};
