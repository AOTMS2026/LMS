import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/aliet_logo.png";

interface PageLoaderProps {
  isVisible: boolean;
}

const PageLoader = ({ isVisible }: PageLoaderProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-xl"
        >
          <div className="relative flex flex-col items-center gap-8">
            {/* Advanced background decorative elements */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"
              />
              <motion.div 
                animate={{ 
                  rotate: -360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                  scale: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl"
              />
            </div>

            {/* Central Animation Element */}
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing rings */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: [1, 1.5 + i * 0.2, 1],
                    opacity: [0, 0.15, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeInOut",
                  }}
                  className="absolute h-32 w-32 rounded-full border border-primary/20"
                />
              ))}

              {/* Logo with sophisticated float and pulse */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ 
                  scale: [1, 1.05, 1], 
                  opacity: 1,
                  y: [0, -10, 0],
                  rotate: 360,
                }}
                transition={{
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 0.6 },
                  y: { 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  },
                  rotate: {
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear"
                  }
                }}
                className="relative z-10 p-4"
              >
                <img 
                  src={logo} 
                  alt="AOTMS Logo" 
                  className="h-20 sm:h-24 w-auto drop-shadow-[0_20px_50px_rgba(0,117,207,0.3)] filter brightness-110" 
                />
              </motion.div>
            </div>

            {/* Premium Loading Indicator */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="relative h-1 w-48 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <motion.div 
                        initial={{ left: "-100%" }}
                        animate={{ left: "100%" }}
                        transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                        }}
                        className="absolute h-full w-full bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                </div>
                
                <div className="flex flex-col items-center">
                  <motion.span 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-[10px] font-black tracking-[0.2em] text-primary uppercase"
                  >
                    Loading...
                  </motion.span>
                </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageLoader;
