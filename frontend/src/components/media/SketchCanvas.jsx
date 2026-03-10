import { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function SketchCanvas({ onDraw, incomingStroke, isTripMode, enabled = true, clearTrigger = 0 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const lastPoint = useRef(null);

  // Clear canvas when clearTrigger changes
  useEffect(() => {
    setStrokes([]);
  }, [clearTrigger]);

  const addStroke = (start, end, color) => {
    const id = Math.random().toString(36).substring(7);
    const newStroke = { id, start, end, color, timestamp: Date.now() };
    setStrokes((prev) => [...prev, newStroke]);
  };

  // Handle incoming strokes from peers
  useEffect(() => {
    if (incomingStroke) {
      const { start, end, color } = incomingStroke;
      addStroke(start, end, color || '#fb7185'); // default rose-400
    }
  }, [incomingStroke]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width;
    const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    if (!enabled) return;
    const point = getPoint(e);
    if (!point) return;
    setIsDrawing(true);
    lastPoint.current = point;
  };

  const draw = (e) => {
    if (!isDrawing || !enabled) return;
    const point = getPoint(e);
    if (!point || !lastPoint.current) return;

    const color = isTripMode ? '#ffffff' : '#fb7185';
    addStroke(lastPoint.current, point, color);
    
    // Notify peer
    onDraw({ start: lastPoint.current, end: point, color });
    
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  return (
    <div className={`fixed inset-0 z-80 touch-none ${enabled ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <AnimatePresence>
          {strokes.map((stroke) => (
            <motion.line
              key={stroke.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              x1={`${stroke.start.x * 100}%`}
              y1={`${stroke.start.y * 100}%`}
              x2={`${stroke.end.x * 100}%`}
              y2={`${stroke.end.y * 100}%`}
              stroke={stroke.color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}
