import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
function handleLinkClick(e, linkUrl, shopDomain) {
  e.preventDefault();
  if (!linkUrl || linkUrl === "#") return;
  let target = linkUrl;
  if (linkUrl.startsWith("/")) {
    if (shopDomain) {
      target = `https://${shopDomain}${linkUrl}`;
    } else {
      target = `https://myshopify.com${linkUrl}`;
    }
  }
  window.open(target, "_blank", "noopener,noreferrer");
}

function EmptyState() {
  return (
    <div className="w-full h-64 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 bg-gray-50">
      <p className="font-semibold text-base">No slides yet</p>
      <p className="text-sm mt-1">Add slides in the editor to see the preview.</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// DESIGN 1 — CLASSIC SLIDER
// Clean, minimal white cards. The free baseline.
// ─────────────────────────────────────────────
export function ClassicSlider({ slides, appearance, layout, navigation, shopDomain }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCards = layout?.visibleCards || 3;
  const gap = layout?.gap || 24;
  const borderRadius = appearance?.borderRadius || 12;

  useEffect(() => {
    if (!navigation?.autoplay) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, slides.length - visibleCards + 1));
    }, navigation.speed || 3000);
    return () => clearInterval(interval);
  }, [navigation?.autoplay, navigation?.speed, slides.length, visibleCards]);

  if (!slides || slides.length === 0) return <EmptyState />;

  const maxIndex = Math.max(0, slides.length - visibleCards);
  const next = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  const prev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));

  return (
    <div className="relative w-full py-4">
      <div className="overflow-hidden w-full">
        <motion.div
          className="flex items-stretch"
          style={{ gap: `${gap}px` }}
          animate={{
            x: `calc(-${currentIndex * (100 / visibleCards)}% - ${currentIndex * (gap / visibleCards)}px)`,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex-shrink-0 h-auto"
              style={{
                width: `calc(${100 / visibleCards}% - ${((visibleCards - 1) * gap) / visibleCards}px)`,
              }}
            >
              {/* Classic card: white, clean, vertical stack */}
              <div
                className="bg-white border border-gray-100 overflow-hidden h-auto flex flex-col group shadow-md hover:shadow-xl transition-shadow duration-300"
                style={{ borderRadius: `${borderRadius}px` }}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
                      style={{ transform: "scale(1)", transition: "transform 700ms ease-out" }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No Image</div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 line-clamp-1">{slide.title || "Untitled"}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{slide.description}</p>
                  </div>
                  {slide.buttonText && (
                    <a
                      href={slide.linkUrl || "#"}
                      onClick={(e) => handleLinkClick(e, slide.linkUrl, shopDomain)}
                      className="mt-3 block text-center bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-black transition-colors"
                    >
                      {slide.buttonText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {navigation?.arrows && (
        <>
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            className="absolute -left-5 top-1/2 -translate-y-1/2 bg-white shadow-lg border border-gray-100 p-2.5 rounded-full text-gray-700 hover:scale-110 disabled:opacity-30 transition-all z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            disabled={currentIndex === maxIndex}
            className="absolute -right-5 top-1/2 -translate-y-1/2 bg-white shadow-lg border border-gray-100 p-2.5 rounded-full text-gray-700 hover:scale-110 disabled:opacity-30 transition-all z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {navigation?.dots && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? "bg-gray-900 w-8" : "bg-gray-300 w-2"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DESIGN 2 — FLOATING CARDS ($49)
// Cards hover above the page. Airy editorial feel.
// Gradient accent top-bar per card, soft colored shadows.
// ─────────────────────────────────────────────
const FLOATING_ACCENTS = [
  "from-violet-400 to-indigo-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-teal-400 to-cyan-500",
  "from-emerald-400 to-green-500",
];

export function FloatingCards({ slides, appearance, layout, navigation, shopDomain }) {
  const visibleCards = layout?.visibleCards || 3;
  const gap = layout?.gap || 28;
  const borderRadius = appearance?.borderRadius || 20;
  const yOffset = layout?.yOffset || -14;
  const staggerDelay = layout?.staggerDelay ?? 0.08;

  if (!slides || slides.length === 0) return <EmptyState />;

  return (
    <div className="relative w-full py-10">
      <div
        className="flex justify-center items-stretch w-full overflow-x-auto scrollbar-none px-4 py-2"
        style={{ gap: `${gap}px` }}
      >
        {slides.map((slide, idx) => {
          const accent = FLOATING_ACCENTS[idx % FLOATING_ACCENTS.length];
          return (
            <motion.div
              key={slide.id}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * staggerDelay, type: "spring", stiffness: 180, damping: 22 }}
              whileHover={{
                y: yOffset,
                scale: 1.03,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              style={{
                width: `calc(${100 / visibleCards}% - ${((visibleCards - 1) * gap) / visibleCards}px)`,
              }}
              className="flex-shrink-0 h-auto"
            >
              {/* Floating card: gradient accent bar, colored shadow on hover */}
              <div
                className="bg-white overflow-hidden h-auto flex flex-col"
                style={{
                  borderRadius: `${borderRadius}px`,
                  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.12)",
                }}
              >
                {/* Gradient accent top bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${accent} flex-shrink-0`} />
                <div className="relative flex-shrink-0 overflow-hidden bg-gray-50 aspect-[4/5] w-full">
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No Image</div>
                  )}
                  {/* Subtle overlay number */}
                  <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1.5 line-clamp-1">{slide.title || "Untitled"}</h3>
                    <p className="text-gray-500 text-sm line-clamp-3">{slide.description}</p>
                  </div>
                  {slide.buttonText && (
                    <a
                      href={slide.linkUrl || "#"}
                      onClick={(e) => handleLinkClick(e, slide.linkUrl, shopDomain)}
                      className={`mt-3 block text-center text-white text-sm font-semibold py-2.5 rounded-xl bg-gradient-to-r ${accent} hover:opacity-90 transition-opacity`}
                    >
                      {slide.buttonText}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DESIGN 3 — COVERFLOW 3D ($49)
// Dark stage, real CSS perspective, mirror reflection.
// ─────────────────────────────────────────────
export function CoverflowSlider({ slides, appearance, layout, navigation, shopDomain }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotationAngle = layout?.rotationAngle ?? 42;
  const centerScale = layout?.centerScale ?? 1.12;
  const depthSpacing = layout?.depthSpacing ?? 200;
  const showReflection = layout?.showReflection ?? true;
  const cardWidth = layout?.cardWidth ?? 300;
  const borderRadius = appearance?.borderRadius ?? 16;

  if (!slides || slides.length === 0) return <EmptyState />;

  const next = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div
      className="relative w-full flex flex-col items-center justify-center py-8"
      style={{ minHeight: 560 }}
    >
      {/* Dark stage */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{ height: 420, perspective: "1200px" }}
      >
        {slides.map((slide, idx) => {
          const offset = idx - currentIndex;
          const isVisible = Math.abs(offset) <= 2;
          if (!isVisible) return null;

          const isActive = offset === 0;
          const xPos = offset * depthSpacing;
          const rotateY = offset * -rotationAngle;
          const scale = isActive ? centerScale : Math.max(0.72, 1 - Math.abs(offset) * 0.14);
          const zIndex = 10 - Math.abs(offset);
          const opacity = Math.abs(offset) >= 2 ? 0.25 : isActive ? 1 : 0.55;
          const brightness = isActive ? 1 : Math.max(0.5, 1 - Math.abs(offset) * 0.25);

          return (
            <motion.div
              key={slide.id}
              animate={{
                x: xPos,
                rotateY,
                scale,
                zIndex,
                opacity,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute cursor-pointer"
              style={{
                width: cardWidth,
                transformStyle: "preserve-3d",
                filter: `brightness(${brightness})`,
              }}
              onClick={() => setCurrentIndex(idx)}
            >
              {/* Card */}
              <div
                className="overflow-hidden bg-gray-900"
                style={{
                  borderRadius: `${borderRadius}px`,
                  height: 360,
                  boxShadow: isActive
                    ? "0 32px 80px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)"
                    : "0 8px 24px -4px rgba(0,0,0,0.4)",
                }}
              >
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">No Image</div>
                )}
                {/* Active card overlay: title + button */}
                {isActive && (
                  <div
                    className="absolute inset-0 flex flex-col justify-end p-5"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)",
                    }}
                  >
                    <h3 className="text-white font-bold text-lg leading-tight mb-1">{slide.title}</h3>
                    {slide.buttonText && (
                      <a
                        href={slide.linkUrl || "#"}
                        onClick={(e) => handleLinkClick(e, slide.linkUrl, shopDomain)}
                        className="mt-2 inline-block bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors w-fit"
                      >
                        {slide.buttonText}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Mirror reflection */}
              {showReflection && isActive && (
                <div
                  className="absolute left-0 right-0 overflow-hidden pointer-events-none"
                  style={{
                    top: "100%",
                    height: 80,
                    borderRadius: `0 0 ${borderRadius}px ${borderRadius}px`,
                    transform: "scaleY(-1)",
                    opacity: 0.18,
                    maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                  }}
                >
                  {slide.imageUrl && (
                    <img src={slide.imageUrl} alt="" className="w-full object-cover object-top" style={{ height: 360 }} />
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5 mt-6 z-20">
        {navigation?.arrows && (
          <button onClick={prev} className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-white p-3 rounded-full transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {navigation?.dots && (
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "bg-white w-6" : "bg-white/30 w-1.5"}`}
              />
            ))}
          </div>
        )}
        {navigation?.arrows && (
          <button onClick={next} className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-white p-3 rounded-full transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DESIGN 4 — STACKED STORY ($99)
// Layered card deck. Drag top card to cycle.
// Portrait cards, story-format, spring physics.
// ─────────────────────────────────────────────
export function StackedStory({ slides, appearance, navigation, layout, shopDomain }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const stackSpread = layout?.stackSpread ?? 22;
  const scaleStep = layout?.scaleStep ?? 0.06;
  const stackDirection = layout?.stackDirection ?? "bottom";
  const enableDrag = navigation?.enableDrag ?? true;
  const borderRadius = appearance?.borderRadius ?? 24;

  if (!slides || slides.length === 0) return <EmptyState />;

  const handleNext = useCallback(
    () => setCurrentIndex((prev) => (prev + 1) % slides.length),
    [slides.length]
  );

  const visibleCount = 3;

  return (
    <div className="relative w-full flex flex-col items-center justify-center" style={{ minHeight: 560 }}>
      <div className="relative flex items-center justify-center" style={{ width: 340, height: 500 }}>
        {slides.map((slide, idx) => {
          const offset = (idx - currentIndex + slides.length) % slides.length;
          if (offset >= visibleCount) return null;

          const isFront = offset === 0;
          const ySign = stackDirection === "bottom" ? 1 : -1;
          const y = isFront ? 0 : offset * stackSpread * ySign;
          const scale = 1 - offset * scaleStep;
          const zIndex = visibleCount - offset;
          const cardOpacity = 1 - offset * 0.15;

          return (
            <motion.div
              key={slide.id}
              className="absolute"
              style={{ width: 320, zIndex, cursor: isFront ? "grab" : "default" }}
              animate={{ y, scale, opacity: cardOpacity }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              drag={isFront && enableDrag ? "y" : false}
              dragConstraints={{ top: -60, bottom: 60 }}
              dragElastic={0.2}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(_, info) => {
                setIsDragging(false);
                if (Math.abs(info.offset.y) > 70 || Math.abs(info.velocity.y) > 400) {
                  handleNext();
                }
              }}
              onClick={() => {
                if (!isDragging && isFront) handleNext();
              }}
            >
              {/* Story-format portrait card */}
              <div
                className="overflow-hidden w-full"
                style={{
                  height: 480,
                  borderRadius: `${borderRadius}px`,
                  boxShadow: isFront
                    ? "0 24px 64px -12px rgba(0,0,0,0.28)"
                    : `0 ${4 + offset * 4}px ${16 + offset * 8}px -4px rgba(0,0,0,0.16)`,
                }}
              >
                {/* Full-bleed image */}
                <div className="relative w-full h-full bg-gray-100">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                  )}
                  {/* Bottom gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.0) 48%)",
                    }}
                  />
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-bold text-xl leading-snug mb-1">{slide.title}</h3>
                    <p className="text-white/70 text-sm line-clamp-2">{slide.description}</p>
                    {slide.buttonText && (
                      <a
                        href={slide.linkUrl || "#"}
                        onClick={(e) => handleLinkClick(e, slide.linkUrl, shopDomain)}
                        className="mt-3 inline-block bg-white text-gray-900 font-bold text-sm px-5 py-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        {slide.buttonText}
                      </a>
                    )}
                  </div>
                  {/* Drag hint on front */}
                  {isFront && enableDrag && (
                    <div className="absolute top-4 right-4 bg-black/30 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                      swipe
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-5 z-20">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? "w-8 bg-gray-900" : "w-4 bg-gray-300"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DESIGN 5 — INFINITE MARQUEE ($99)
// Seamless continuous scroll. Fashion/brand energy.
// ─────────────────────────────────────────────
export function InfiniteMarquee({ slides, appearance, layout, navigation, shopDomain }) {
  const marqueeDirection = navigation?.marqueeDirection ?? "left";
  const marqueeSpeed = navigation?.marqueeSpeed ?? 28; // seconds
  const pauseOnHover = navigation?.pauseOnHover ?? true;
  const cardWidth = layout?.cardWidth ?? 300;
  const gap = layout?.gap ?? 20;
  const borderRadius = appearance?.borderRadius ?? 16;

  if (!slides || slides.length === 0) return <EmptyState />;

  // Duplicate enough times for seamless loop
  const repeated = [...slides, ...slides, ...slides, ...slides];
  // Fix direction logic: scrolling "left" means translating negative x (right-to-left flow)
  const directionSign = marqueeDirection === "left" ? 1 : -1;

  return (
    <div className="relative w-full overflow-hidden py-8" style={{ userSelect: "none" }}>
      <motion.div
        className="flex"
        style={{ gap: `${gap}px`, width: "max-content" }}
        animate={{ x: [0, directionSign * -((cardWidth + gap) * slides.length)] }}
        transition={{
          ease: "linear",
          duration: marqueeSpeed,
          repeat: Infinity,
          repeatType: "loop",
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
      >
        {repeated.map((slide, idx) => (
          <div
            key={`${slide.id}-${idx}`}
            className="flex-shrink-0 group py-2"
            style={{ width: cardWidth }}
          >
            {/* Marquee card: tall, hover shadow, lift interaction */}
            <div
              className="overflow-hidden bg-gray-100 relative shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
              style={{
                height: 380,
                borderRadius: `${borderRadius}px`,
              }}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No Image</div>
              )}
              {/* Hover reveal overlay */}
              <div
                className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.68) 0%, transparent 55%)" }}
              >
                <h3 className="text-white font-bold text-base leading-tight">{slide.title}</h3>
                {slide.buttonText && (
                  <a
                    href={slide.linkUrl || "#"}
                    onClick={(e) => handleLinkClick(e, slide.linkUrl, shopDomain)}
                    className="mt-2 inline-block border border-white text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-white hover:text-gray-900 transition-colors w-fit"
                  >
                    {slide.buttonText}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Fade edges */}
      <div
        className="absolute inset-y-0 left-0 w-20 pointer-events-none z-10"
        style={{ background: "linear-gradient(to right, var(--bg, white), transparent)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-20 pointer-events-none z-10"
        style={{ background: "linear-gradient(to left, var(--bg, white), transparent)" }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// DESIGN 6 — 3D SHOWCASE ($99)
// One product hero. Mouse-tilt 3D. Luxury feel.
// ─────────────────────────────────────────────
function TiltCard({ children, strength = 12, borderRadius = 24 }) {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotateY.set(dx * strength);
    rotateX.set(-dy * strength);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: "preserve-3d",
        borderRadius,
        overflow: "hidden",
        willChange: "transform",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

export function Showcase3D({ slides, appearance, navigation, layout, shopDomain }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const layoutSide = layout?.layoutSide ?? "left";
  const tiltStrength = layout?.tiltStrength ?? 12;
  const showGradientBg = layout?.showGradientBg ?? true;
  const buttonStyle = navigation?.buttonStyle ?? "solid";
  const borderRadius = appearance?.borderRadius ?? 24;

  if (!slides || slides.length === 0) return <EmptyState />;

  const slide = slides[currentIndex];
  const next = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const btnClass =
    buttonStyle === "outline"
      ? "border-2 border-gray-900 text-gray-900 bg-transparent hover:bg-gray-900 hover:text-white"
      : buttonStyle === "glass"
        ? "bg-white/20 backdrop-blur border border-white/30 text-white hover:bg-white/30"
        : "bg-gray-900 text-white hover:bg-black";

  const textSide = layoutSide === "right" ? "order-2" : "order-1";
  const imageSide = layoutSide === "right" ? "order-1" : "order-2";

  return (
    <div className="relative w-full" style={{ minHeight: 560 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-12"
          style={{ perspective: "1000px" }}
        >
          {/* Text side */}
          <div className={`flex-1 ${textSide}`}>
            <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
              {String(currentIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4" style={{ fontFamily: appearance?.fontFamily }}>
              {slide.title}
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">{slide.description}</p>
            {slide.buttonText && (
              <a
                href={slide.linkUrl || "#"}
                onClick={(e) => handleLinkClick(e, slide.linkUrl, shopDomain)}
                className={`inline-block px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 ${btnClass}`}
              >
                {slide.buttonText}
              </a>
            )}
            {/* Navigation */}
            <div className="flex gap-3 mt-10">
              <button
                onClick={prev}
                className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center text-white hover:bg-black transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image / 3D tilt side */}
          <div className={`flex-1 relative ${imageSide}`}>
            {showGradientBg && (
              <div
                className="absolute -inset-8 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.10) 50%, transparent 75%)",
                  filter: "blur(32px)",
                  zIndex: 0,
                }}
              />
            )}
            <div className="relative z-10" style={{ perspective: "900px" }}>
              <TiltCard strength={tiltStrength} borderRadius={borderRadius}>
                <div
                  className="w-full bg-gray-100 overflow-hidden"
                  style={{ aspectRatio: "4/5", borderRadius }}
                >
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No Image</div>
                  )}
                </div>
              </TiltCard>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}