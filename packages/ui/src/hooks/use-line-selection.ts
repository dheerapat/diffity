import { useState, useCallback, useRef, useEffect } from 'react';
import type { CommentSide, LineSelection } from '../types/comment';

interface UseLineSelectionOptions {
  filePath: string;
  onSelectionComplete: (selection: LineSelection) => void;
  computeCrossSideRanges?: (
    anchorLine: number,
    anchorSide: CommentSide,
    currentLine: number,
    currentSide: CommentSide,
  ) => { oldStartLine?: number; oldEndLine?: number; newStartLine?: number; newEndLine?: number } | null;
}

interface UseLineSelectionReturn {
  selectionState: {
    anchorSide: CommentSide;
    anchorLine: number;
    currentSide: CommentSide;
    currentLine: number;
  } | null;
  handleLineMouseDown: (line: number, side: CommentSide) => void;
  handleLineMouseEnter: (line: number, side: CommentSide) => void;
  isLineInSelection: (line: number, side: CommentSide) => boolean;
  getSelectionRange: () => { startLine: number; endLine: number; side: CommentSide } | null;
}

function getLineNumberAndSideFromPoint(x: number, y: number): { lineNumber: number; side: CommentSide } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    return null;
  }

  const td = el.closest('td[data-line-side]') as HTMLTableCellElement | null;
  if (!td) {
    return null;
  }

  const text = td.textContent?.trim();
  if (!text) {
    return null;
  }

  const num = parseInt(text, 10);
  if (isNaN(num)) {
    return null;
  }

  const side = td.dataset.lineSide as CommentSide | undefined;
  if (side !== 'old' && side !== 'new') {
    return null;
  }

  return { lineNumber: num, side };
}

export function useLineSelection(options: UseLineSelectionOptions): UseLineSelectionReturn {
  const { filePath, onSelectionComplete, computeCrossSideRanges } = options;
  const [selectionState, setSelectionState] = useState<{
    anchorSide: CommentSide;
    anchorLine: number;
    currentSide: CommentSide;
    currentLine: number;
  } | null>(null);
  const isDragging = useRef(false);
  const selectionRef = useRef(selectionState);
  selectionRef.current = selectionState;

  const handleLineMouseDown = useCallback((line: number, side: CommentSide) => {
    isDragging.current = true;
    setSelectionState({ anchorSide: side, anchorLine: line, currentSide: side, currentLine: line });
  }, []);

  const handleLineMouseEnter = useCallback((line: number, side: CommentSide) => {
    if (!isDragging.current || !selectionRef.current) {
      return;
    }
    setSelectionState(prev => {
      if (!prev) {
        return prev;
      }
      return { ...prev, currentLine: line, currentSide: side };
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) {
        return;
      }

      const result = getLineNumberAndSideFromPoint(e.clientX, e.clientY);
      if (result !== null) {
        setSelectionState(prev => {
          if (!prev || (prev.currentLine === result.lineNumber && prev.currentSide === result.side)) {
            return prev;
          }
          return { ...prev, currentLine: result.lineNumber, currentSide: result.side };
        });
      }
    };

    const handleMouseUp = () => {
      const state = selectionRef.current;
      if (!isDragging.current || !state) {
        isDragging.current = false;
        return;
      }
      isDragging.current = false;

      if (state.anchorSide === state.currentSide) {
        const startLine = Math.min(state.anchorLine, state.currentLine);
        const endLine = Math.max(state.anchorLine, state.currentLine);
        onSelectionComplete({
          filePath,
          side: state.anchorSide,
          startLine,
          endLine,
        });
      } else {
        const ranges = computeCrossSideRanges?.(state.anchorLine, state.anchorSide, state.currentLine, state.currentSide);
        if (ranges && (ranges.oldStartLine !== undefined || ranges.newStartLine !== undefined)) {
          const oldMin = ranges.oldStartLine ?? Number.MAX_SAFE_INTEGER;
          const newMin = ranges.newStartLine ?? Number.MAX_SAFE_INTEGER;
          const oldMax = ranges.oldEndLine ?? 0;
          const newMax = ranges.newEndLine ?? 0;
          const startLine = Math.min(oldMin, newMin);
          const endLine = Math.max(oldMax, newMax);
          onSelectionComplete({
            filePath,
            side: 'both',
            startLine,
            endLine,
            ...ranges,
          });
        }
      }
      setSelectionState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [filePath, onSelectionComplete, computeCrossSideRanges]);

  const isLineInSelection = useCallback((line: number, side: CommentSide) => {
    if (!selectionState) {
      return false;
    }
    if (selectionState.anchorSide === selectionState.currentSide) {
      if (side !== selectionState.anchorSide) {
        return false;
      }
      const start = Math.min(selectionState.anchorLine, selectionState.currentLine);
      const end = Math.max(selectionState.anchorLine, selectionState.currentLine);
      return line >= start && line <= end;
    }
    // Cross-side: highlight lines on both sides in the numeric overlap range
    const start = Math.min(selectionState.anchorLine, selectionState.currentLine);
    const end = Math.max(selectionState.anchorLine, selectionState.currentLine);
    if (side === selectionState.anchorSide || side === selectionState.currentSide) {
      return line >= start && line <= end;
    }
    return false;
  }, [selectionState]);

  const getSelectionRange = useCallback(() => {
    if (!selectionState) {
      return null;
    }
    const side: CommentSide = selectionState.anchorSide === selectionState.currentSide ? selectionState.anchorSide : 'both';
    return {
      startLine: Math.min(selectionState.anchorLine, selectionState.currentLine),
      endLine: Math.max(selectionState.anchorLine, selectionState.currentLine),
      side,
    };
  }, [selectionState]);

  return {
    selectionState,
    handleLineMouseDown,
    handleLineMouseEnter,
    isLineInSelection,
    getSelectionRange,
  };
}
