import { useRef, useEffect, useCallback } from 'react';

interface UseAutoResizeTextareaProps {
  minHeight?: number;
  maxHeight?: number;
}

export function useAutoResizeTextarea({
  minHeight = 64, // Default min height
  maxHeight = 200, // Default max height
}: UseAutoResizeTextareaProps = {}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback((reset = false) => {
    const textarea = textareaRef.current;
    if (textarea) {
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      // Temporarily shrink height to get accurate scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;

      // Set height based on scrollHeight, clamped by min/maxHeight
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
    }
  }, [minHeight, maxHeight]);

  // Adjust height on mount and when dependencies change
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}