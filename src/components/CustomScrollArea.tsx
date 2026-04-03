import React from 'react';

type ScrollOrientation = 'vertical' | 'horizontal' | 'both';
type ScrollAxis = 'vertical' | 'horizontal';

type CustomScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  orientation?: ScrollOrientation;
};

type DragState = {
  axis: ScrollAxis;
  startPointer: number;
  startScroll: number;
};

const RAIL_INSET = 6;
const RAIL_HIT_SIZE = 12;
const THUMB_SIZE = 6;
const MIN_THUMB_SIZE = 28;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getThumbSize(trackSize: number, clientSize: number, scrollSize: number) {
  if (trackSize <= 0 || clientSize <= 0 || scrollSize <= clientSize) return 0;
  return clamp((clientSize / scrollSize) * trackSize, MIN_THUMB_SIZE, trackSize);
}

export default function CustomScrollArea({
  children,
  className,
  viewportClassName,
  orientation = 'vertical',
}: CustomScrollAreaProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const verticalRailRef = React.useRef<HTMLDivElement>(null);
  const horizontalRailRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<number | null>(null);
  const scrollIdleTimerRef = React.useRef<number | null>(null);
  const dragStateRef = React.useRef<DragState | null>(null);
  const [metrics, setMetrics] = React.useState({
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
    clientWidth: 0,
    scrollWidth: 0,
    scrollLeft: 0,
  });
  const [isHovered, setIsHovered] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [dragAxis, setDragAxis] = React.useState<ScrollAxis | null>(null);

  const supportsVertical = orientation !== 'horizontal';
  const supportsHorizontal = orientation !== 'vertical';
  const hasVerticalOverflow = supportsVertical && metrics.scrollHeight - metrics.clientHeight > 1;
  const hasHorizontalOverflow = supportsHorizontal && metrics.scrollWidth - metrics.clientWidth > 1;

  const verticalBottomInset = hasHorizontalOverflow ? RAIL_INSET + RAIL_HIT_SIZE : RAIL_INSET;
  const horizontalRightInset = hasVerticalOverflow ? RAIL_INSET + RAIL_HIT_SIZE : RAIL_INSET;

  const verticalTrackHeight = Math.max(metrics.clientHeight - RAIL_INSET - verticalBottomInset, 0);
  const horizontalTrackWidth = Math.max(metrics.clientWidth - RAIL_INSET - horizontalRightInset, 0);

  const verticalThumbHeight = getThumbSize(verticalTrackHeight, metrics.clientHeight, metrics.scrollHeight);
  const horizontalThumbWidth = getThumbSize(horizontalTrackWidth, metrics.clientWidth, metrics.scrollWidth);

  const verticalMaxScroll = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
  const horizontalMaxScroll = Math.max(metrics.scrollWidth - metrics.clientWidth, 0);
  const verticalMaxThumbOffset = Math.max(verticalTrackHeight - verticalThumbHeight, 0);
  const horizontalMaxThumbOffset = Math.max(horizontalTrackWidth - horizontalThumbWidth, 0);

  const verticalThumbOffset = verticalMaxScroll > 0 && verticalMaxThumbOffset > 0
    ? (metrics.scrollTop / verticalMaxScroll) * verticalMaxThumbOffset
    : 0;
  const horizontalThumbOffset = horizontalMaxScroll > 0 && horizontalMaxThumbOffset > 0
    ? (metrics.scrollLeft / horizontalMaxScroll) * horizontalMaxThumbOffset
    : 0;

  const measure = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const nextMetrics = {
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      clientWidth: viewport.clientWidth,
      scrollWidth: viewport.scrollWidth,
      scrollLeft: viewport.scrollLeft,
    };

    setMetrics((current) => (
      current.clientHeight === nextMetrics.clientHeight
      && current.scrollHeight === nextMetrics.scrollHeight
      && current.scrollTop === nextMetrics.scrollTop
      && current.clientWidth === nextMetrics.clientWidth
      && current.scrollWidth === nextMetrics.scrollWidth
      && current.scrollLeft === nextMetrics.scrollLeft
        ? current
        : nextMetrics
    ));
  }, []);

  const scheduleMeasure = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      measure();
    });
  }, [measure]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof window === 'undefined') return;

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });

    const syncObservedElements = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(viewport);
      Array.from(viewport.children).forEach((child) => resizeObserver.observe(child as Element));
    };

    syncObservedElements();

    const mutationObserver = new MutationObserver(() => {
      syncObservedElements();
      scheduleMeasure();
    });

    mutationObserver.observe(viewport, { childList: true, subtree: true });

    const handleScroll = () => {
      scheduleMeasure();
      setIsScrolling(true);

      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }

      scrollIdleTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        scrollIdleTimerRef.current = null;
      }, 480);
    };

    const handleWindowResize = () => {
      scheduleMeasure();
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleWindowResize);

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleWindowResize);
      mutationObserver.disconnect();
      resizeObserver.disconnect();

      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [scheduleMeasure]);

  React.useEffect(() => {
    if (!dragAxis || typeof window === 'undefined') return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const viewport = viewportRef.current;
      const dragState = dragStateRef.current;
      if (!viewport || !dragState) return;

      if (dragState.axis === 'vertical') {
        const rail = verticalRailRef.current;
        if (!rail) return;

        const trackHeight = rail.clientHeight;
        const thumbHeight = getThumbSize(trackHeight, viewport.clientHeight, viewport.scrollHeight);
        const maxThumbOffset = Math.max(trackHeight - thumbHeight, 0);
        const maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
        if (maxThumbOffset <= 0 || maxScrollTop <= 0) return;

        const deltaY = event.clientY - dragState.startPointer;
        viewport.scrollTop = clamp(
          dragState.startScroll + (deltaY / maxThumbOffset) * maxScrollTop,
          0,
          maxScrollTop,
        );
      } else {
        const rail = horizontalRailRef.current;
        if (!rail) return;

        const trackWidth = rail.clientWidth;
        const thumbWidth = getThumbSize(trackWidth, viewport.clientWidth, viewport.scrollWidth);
        const maxThumbOffset = Math.max(trackWidth - thumbWidth, 0);
        const maxScrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
        if (maxThumbOffset <= 0 || maxScrollLeft <= 0) return;

        const deltaX = event.clientX - dragState.startPointer;
        viewport.scrollLeft = clamp(
          dragState.startScroll + (deltaX / maxThumbOffset) * maxScrollLeft,
          0,
          maxScrollLeft,
        );
      }

      scheduleMeasure();
    };

    const stopDragging = () => {
      dragStateRef.current = null;
      setDragAxis(null);
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      document.body.style.userSelect = '';
    };
  }, [dragAxis, scheduleMeasure]);

  const jumpToPointer = React.useCallback((axis: ScrollAxis, clientCoordinate: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (axis === 'vertical') {
      const rail = verticalRailRef.current;
      if (!rail) return;

      const railRect = rail.getBoundingClientRect();
      const trackHeight = rail.clientHeight;
      const thumbHeight = getThumbSize(trackHeight, viewport.clientHeight, viewport.scrollHeight);
      const maxThumbOffset = Math.max(trackHeight - thumbHeight, 0);
      const maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
      if (maxThumbOffset <= 0 || maxScrollTop <= 0) return;

      const targetThumbOffset = clamp(clientCoordinate - railRect.top - thumbHeight / 2, 0, maxThumbOffset);
      viewport.scrollTop = (targetThumbOffset / maxThumbOffset) * maxScrollTop;
    } else {
      const rail = horizontalRailRef.current;
      if (!rail) return;

      const railRect = rail.getBoundingClientRect();
      const trackWidth = rail.clientWidth;
      const thumbWidth = getThumbSize(trackWidth, viewport.clientWidth, viewport.scrollWidth);
      const maxThumbOffset = Math.max(trackWidth - thumbWidth, 0);
      const maxScrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
      if (maxThumbOffset <= 0 || maxScrollLeft <= 0) return;

      const targetThumbOffset = clamp(clientCoordinate - railRect.left - thumbWidth / 2, 0, maxThumbOffset);
      viewport.scrollLeft = (targetThumbOffset / maxThumbOffset) * maxScrollLeft;
    }

    scheduleMeasure();
  }, [scheduleMeasure]);

  const thumbOpacityClass = dragAxis || isScrolling ? 'opacity-100' : isHovered ? 'opacity-95' : 'opacity-75';

  return (
    <div
      className={joinClasses('relative min-h-0 min-w-0', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={viewportRef}
        className={joinClasses(
          'custom-scroll-area__viewport h-full min-h-0 min-w-0 overflow-auto',
          viewportClassName,
        )}
      >
        {children}
      </div>

      {hasVerticalOverflow && (
        <div
          className={joinClasses(
            'pointer-events-none absolute right-1 z-20 w-3 transition-opacity duration-200',
            thumbOpacityClass,
          )}
          style={{ top: `${RAIL_INSET}px`, bottom: `${verticalBottomInset}px` }}
          aria-hidden="true"
        >
          <div
            ref={verticalRailRef}
            className="pointer-events-auto relative h-full w-full"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).dataset.scrollThumb === 'true') return;
              event.preventDefault();
              jumpToPointer('vertical', event.clientY);
              dragStateRef.current = {
                axis: 'vertical',
                startPointer: event.clientY,
                startScroll: viewportRef.current?.scrollTop || 0,
              };
              setDragAxis('vertical');
              document.body.style.userSelect = 'none';
            }}
          >
            <div
              data-scroll-thumb="true"
              className={joinClasses(
                'custom-scroll-area__thumb is-vertical absolute left-1/2 -translate-x-1/2 rounded-full',
                dragAxis === 'vertical' ? 'is-dragging' : '',
              )}
              style={{
                top: `${verticalThumbOffset}px`,
                height: `${verticalThumbHeight}px`,
                width: `${THUMB_SIZE}px`,
              }}
              onPointerDown={(event) => {
                const viewport = viewportRef.current;
                if (!viewport) return;
                event.preventDefault();
                event.stopPropagation();
                dragStateRef.current = {
                  axis: 'vertical',
                  startPointer: event.clientY,
                  startScroll: viewport.scrollTop,
                };
                setDragAxis('vertical');
                document.body.style.userSelect = 'none';
              }}
            />
          </div>
        </div>
      )}

      {hasHorizontalOverflow && (
        <div
          className={joinClasses(
            'pointer-events-none absolute bottom-1 z-20 h-3 transition-opacity duration-200',
            thumbOpacityClass,
          )}
          style={{ left: `${RAIL_INSET}px`, right: `${horizontalRightInset}px` }}
          aria-hidden="true"
        >
          <div
            ref={horizontalRailRef}
            className="pointer-events-auto relative h-full w-full"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).dataset.scrollThumb === 'true') return;
              event.preventDefault();
              jumpToPointer('horizontal', event.clientX);
              dragStateRef.current = {
                axis: 'horizontal',
                startPointer: event.clientX,
                startScroll: viewportRef.current?.scrollLeft || 0,
              };
              setDragAxis('horizontal');
              document.body.style.userSelect = 'none';
            }}
          >
            <div
              data-scroll-thumb="true"
              className={joinClasses(
                'custom-scroll-area__thumb is-horizontal absolute top-1/2 -translate-y-1/2 rounded-full',
                dragAxis === 'horizontal' ? 'is-dragging' : '',
              )}
              style={{
                left: `${horizontalThumbOffset}px`,
                width: `${horizontalThumbWidth}px`,
                height: `${THUMB_SIZE}px`,
              }}
              onPointerDown={(event) => {
                const viewport = viewportRef.current;
                if (!viewport) return;
                event.preventDefault();
                event.stopPropagation();
                dragStateRef.current = {
                  axis: 'horizontal',
                  startPointer: event.clientX,
                  startScroll: viewport.scrollLeft,
                };
                setDragAxis('horizontal');
                document.body.style.userSelect = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
