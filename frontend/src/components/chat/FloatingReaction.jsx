import { motion } from 'framer-motion';

export function FloatingReaction({ emoji, onComplete, startX, endX }) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.5, x: startX }}
      animate={{ y: -400, opacity: 0, scale: 1.5, x: endX }}
      transition={{ duration: 3, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute bottom-20 text-4xl pointer-events-none select-none z-50 left-1/2 -translate-x-1/2"
    >
      {emoji}
    </motion.div>
  );
}
