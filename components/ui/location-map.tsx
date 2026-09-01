"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";

interface LocationMapProps {
  location?: string;
  coordinates?: string;
  /** Text of the status pill (was "Live" upstream). */
  statusLabel?: string;
  /** Hint shown on hover while collapsed. */
  hintLabel?: string;
  className?: string;
}

// This project has no shadcn theme tokens (no components.json; globals.css only
// defines --color-background / --color-foreground), so `bg-muted`,
// `border-border`, `text-muted-foreground` etc. from the upstream component
// would emit nothing. Colours are pinned here to the same palette the rest of
// the book uses, and the card is always light because the pages are light.
const C = {
  card: "#ffffff",
  border: "#e5e5e5",
  mapBg: "#f1f2f4",
  text: "#1f2937",
  muted: "#6b7280",
  road: "rgba(31, 41, 55, 0.22)",
  roadThin: "rgba(31, 41, 55, 0.10)",
  building: "rgba(107, 114, 128, 0.30)",
  pill: "rgba(31, 41, 55, 0.05)",
  pillHover: "rgba(31, 41, 55, 0.09)",
  accent: "#34D399",
};

// Upstream hardcoded 240x140 collapsed / 360x280 expanded, which overflows a
// max-w-[420px] page (and badly at 375px). The card is now fluid: it fills its
// container width and the height is derived from that measured width, clamped
// so it stays sensible at both extremes.
const COLLAPSED_RATIO = 0.44;
const EXPANDED_RATIO = 0.86;
const COLLAPSED_MIN = 104;
const COLLAPSED_MAX = 140;
const EXPANDED_MIN = 186;
const EXPANDED_MAX = 260;

const clampPx = (v: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, v)));

export function LocationMap({
  location = "San Francisco, CA",
  coordinates = "37.7749° N, 122.4194° W",
  statusLabel = "Live",
  hintLabel = "Click to expand",
  className,
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [width, setWidth] = useState(240);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the available width so the height can follow it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 240);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const collapsedH = clampPx(
    width * COLLAPSED_RATIO,
    COLLAPSED_MIN,
    COLLAPSED_MAX,
  );
  const expandedH = clampPx(width * EXPANDED_RATIO, EXPANDED_MIN, EXPANDED_MAX);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-50, 50], [8, -8]);
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // react-pageflip listens for pointer/mouse/touch events on its parent and
  // turns the page. Every entry point has to be swallowed here, not just click,
  // or tapping the map flips the book instead of expanding the card.
  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if ("nativeEvent" in e) e.nativeEvent.stopImmediatePropagation?.();
  };

  // Toggle on capture-phase pointerdown, not click. react-pageflip registers a
  // capture listener on an ancestor and preventDefault()s mousedown, so a real
  // press never produces a click event here (a synthetic one does, which is what
  // made this look like a handler bug). Capture also lets us swallow the event
  // before the library sees it, so the page never turns.
  const handlePointerDownCapture = (e: React.PointerEvent) => {
    stop(e);
    setIsExpanded((v) => !v);
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative w-full cursor-pointer select-none ${className ?? ""}`}
      style={{ perspective: 1000, touchAction: "manipulation" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onPointerDownCapture={handlePointerDownCapture}
      onMouseDownCapture={stop}
      onTouchStartCapture={stop}
      onClickCapture={stop}
    >
      <motion.div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
          background: C.card,
          border: `1px solid ${C.border}`,
        }}
        animate={{ height: isExpanded ? expandedH : collapsedH }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div
                className="absolute inset-0"
                style={{ background: C.mapBg }}
              />

              <svg
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
              >
                <motion.line
                  x1="0%"
                  y1="35%"
                  x2="100%"
                  y2="35%"
                  stroke={C.road}
                  strokeWidth="4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
                <motion.line
                  x1="0%"
                  y1="65%"
                  x2="100%"
                  y2="65%"
                  stroke={C.road}
                  strokeWidth="4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
                <motion.line
                  x1="30%"
                  y1="0%"
                  x2="30%"
                  y2="100%"
                  stroke={C.road}
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                />
                <motion.line
                  x1="70%"
                  y1="0%"
                  x2="70%"
                  y2="100%"
                  stroke={C.road}
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                />

                {[20, 50, 80].map((y, i) => (
                  <motion.line
                    key={`h-${i}`}
                    x1="0%"
                    y1={`${y}%`}
                    x2="100%"
                    y2={`${y}%`}
                    stroke={C.roadThin}
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  />
                ))}
                {[15, 45, 55, 85].map((x, i) => (
                  <motion.line
                    key={`v-${i}`}
                    x1={`${x}%`}
                    y1="0%"
                    x2={`${x}%`}
                    y2="100%"
                    stroke={C.roadThin}
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                  />
                ))}
              </svg>

              {[
                { top: "40%", left: "10%", w: "15%", h: "20%", d: 0.5 },
                { top: "15%", left: "35%", w: "12%", h: "15%", d: 0.6 },
                { top: "70%", left: "75%", w: "18%", h: "18%", d: 0.7 },
                { top: "20%", left: "80%", w: "10%", h: "25%", d: 0.55 },
                { top: "55%", left: "5%", w: "8%", h: "12%", d: 0.65 },
                { top: "8%", left: "60%", w: "14%", h: "10%", d: 0.75 },
              ].map((b, i) => (
                <motion.div
                  key={`b-${i}`}
                  className="absolute rounded-sm"
                  style={{
                    top: b.top,
                    left: b.left,
                    width: b.w,
                    height: b.h,
                    background: C.building,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: b.d }}
                />
              ))}

              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 20,
                  delay: 0.3,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(52, 211, 153, 0.5))",
                  }}
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    fill={C.accent}
                  />
                  <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid pattern - only while collapsed */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: isExpanded ? 0 : 0.05 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern
                id="location-map-grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke={C.text}
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#location-map-grid)" />
          </svg>
        </motion.div>

        {/* Content */}
        <div
          className="relative z-10 flex h-full flex-col justify-between"
          style={{ padding: "clamp(0.6rem, 3.2vw, 1.1rem)" }}
        >
          <div className="flex items-start justify-between">
            <motion.div
              animate={{ opacity: isExpanded ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{
                  filter: isHovered
                    ? "drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))"
                    : "drop-shadow(0 0 4px rgba(52, 211, 153, 0.3))",
                }}
                transition={{ duration: 0.3 }}
              >
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" x2="9" y1="3" y2="18" />
                <line x1="15" x2="15" y1="6" y2="21" />
              </motion.svg>
            </motion.div>

            {/* Status pill */}
            <motion.div
              className="flex items-center gap-1.5 rounded-full"
              style={{
                padding: "0.15rem 0.5rem",
                background: isHovered ? C.pillHover : C.pill,
              }}
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: C.accent }}
              />
              <span
                className="map-status font-medium"
                style={{ color: C.muted }}
              >
                {statusLabel}
              </span>
            </motion.div>
          </div>

          <div className="space-y-1">
            <motion.h3
              className="map-location font-medium"
              style={{ color: C.text }}
              animate={{ x: isHovered ? -4 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {location}
            </motion.h3>

            <AnimatePresence>
              {isExpanded && (
                <motion.p
                  className="map-coords"
                  style={{ color: C.muted }}
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {coordinates}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              className="h-px"
              style={{
                background:
                  "linear-gradient(to left, rgba(16,185,129,0.5), rgba(52,211,153,0.3), transparent)",
              }}
              initial={{ scaleX: 0, originX: 1 }}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.3 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Hover hint. Sits in the wrapper's reserved bottom padding so the page
          never has to clip it. */}
      <motion.p
        className="map-hint absolute left-1/2 whitespace-nowrap"
        style={{ x: "-50%", bottom: "-1.15rem", color: C.muted }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isHovered && !isExpanded ? 1 : 0,
          y: isHovered ? 0 : 4,
        }}
        transition={{ duration: 0.2 }}
      >
        {hintLabel}
      </motion.p>
    </motion.div>
  );
}
