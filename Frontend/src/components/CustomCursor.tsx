import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  // hasMoved: true only after the first real mousemove — prevents any render until mouse enters
  const [hasMoved, setHasMoved] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    let rafId: number;

    const moveCursor = (e: MouseEvent) => {
      if (!hasMoved) setHasMoved(true);
      if (!isVisible) setIsVisible(true);
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      });
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp   = () => setIsClicked(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") !== null ||
        target.closest("a") !== null ||
        target.closest("[role='button']") !== null ||
        window.getComputedStyle(target).cursor === "pointer";
      setIsHovering(isInteractive);
    };

    window.addEventListener("mousemove",  moveCursor,       { passive: true });
    window.addEventListener("mousedown",  handleMouseDown,  { passive: true });
    window.addEventListener("mouseup",    handleMouseUp,    { passive: true });
    window.addEventListener("mouseover",  handleMouseOver,  { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter, { passive: true });

    return () => {
      window.removeEventListener("mousemove",  moveCursor);
      window.removeEventListener("mousedown",  handleMouseDown);
      window.removeEventListener("mouseup",    handleMouseUp);
      window.removeEventListener("mouseover",  handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(rafId);
    };
  }, [mouseX, mouseY, isVisible, hasMoved]);

  // Don't render on mobile / touch devices
  if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
    return null;
  }

  // Don't render ANYTHING until the mouse has moved at least once
  // This is the key fix — prevents the white circle appearing at top-left on page load
  if (!hasMoved) return null;

  return (
    <>
      <style>{`body { cursor: default; }`}</style>

      {/* Trailing Aura Ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          width:  isHovering ? 48 : 32,
          height: isHovering ? 48 : 32,
          scale:  isClicked  ? 0.85 : 1,
        }}
        transition={{
          width:  { duration: 0.2 },
          height: { duration: 0.2 },
          scale:  { duration: 0.1 },
        }}
      >
        <div className={`w-full h-full rounded-full transition-all duration-300 ${
          isHovering
            ? "border-2 border-[#FD5A1A]/60 bg-[#FD5A1A]/10 shadow-[0_0_20px_rgba(253,90,26,0.2)]"
            : "border-[1.5px] border-[#0075CF]/70 shadow-[0_0_10px_rgba(0,117,207,0.15)]"
        }`} />
      </motion.div>

      {/* Precision Core Dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10001] rounded-full"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%",
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          width:           6,
          height:          6,
          backgroundColor: isHovering ? "#FD5A1A" : "#0075CF",
          scale:           isClicked ? 0 : (isHovering ? 0 : 1),
          opacity:         isHovering ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
    </>
  );
};

export default CustomCursor;