import { motion } from 'framer-motion';
import { Heart, Flame, Music4, Sparkles, PartyPopper } from "lucide-react";

const ICON_MAP = {
  heart: { Icon: Heart, color: 'text-rose-500' },
  fire: { Icon: Flame, color: 'text-orange-500' },
  music: { Icon: Music4, color: 'text-purple-500' },
  sparkle: { Icon: Sparkles, color: 'text-yellow-500' },
  party: { Icon: PartyPopper, color: 'text-blue-500' },
};

export function FloatingReaction({ emoji: type, onComplete, startX, endX }) {
  const { Icon, color } = ICON_MAP[type] || { Icon: Heart, color: 'text-rose-500' };

  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.5, x: startX }}
      animate={{ y: -400, opacity: 0, scale: 1.5, x: endX }}
      transition={{ duration: 3, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute bottom-20 pointer-events-none select-none z-50 left-1/2 -translate-x-1/2"
    >
      <Icon className={`w-8 h-8 ${color} filter drop-shadow-lg`} />
    </motion.div>
  );
}
