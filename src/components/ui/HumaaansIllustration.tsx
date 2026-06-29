import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { IllustrationId } from '../../lib/illustrations';
import { getIllustrationSrc, ILLUSTRATION_ALT } from '../../lib/illustrations';

type HumaaansIllustrationProps = {
  id: IllustrationId;
  className?: string;
  alt?: string;
  animate?: boolean;
};

export function HumaaansIllustration({
  id,
  className,
  alt,
  animate = false,
}: HumaaansIllustrationProps) {
  const img = (
    <img
      src={getIllustrationSrc(id)}
      alt={alt ?? ILLUSTRATION_ALT[id]}
      className={clsx('pointer-events-none select-none object-contain', className)}
      loading="lazy"
      draggable={false}
    />
  );

  if (!animate) return img;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="animate-float"
    >
      {img}
    </motion.div>
  );
}
