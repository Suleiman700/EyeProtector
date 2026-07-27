import { r as reactExports, j as jsxRuntimeExports, c as createRoot, R as React } from "./client-Cd8D_Os3.js";
import { M as MotionConfigContext, u as useConstant, P as PresenceContext, a as usePresence, b as useIsomorphicLayoutEffect, L as LayoutGroupContext, m as motion } from "./proxy-EwNnx6yi.js";
class PopChildMeasure extends reactExports.Component {
  getSnapshotBeforeUpdate(prevProps) {
    const element = this.props.childRef.current;
    if (element && prevProps.isPresent && !this.props.isPresent) {
      const size = this.props.sizeRef.current;
      size.height = element.offsetHeight || 0;
      size.width = element.offsetWidth || 0;
      size.top = element.offsetTop;
      size.left = element.offsetLeft;
    }
    return null;
  }
  /**
   * Required with getSnapshotBeforeUpdate to stop React complaining.
   */
  componentDidUpdate() {
  }
  render() {
    return this.props.children;
  }
}
function PopChild({ children, isPresent }) {
  const id = reactExports.useId();
  const ref = reactExports.useRef(null);
  const size = reactExports.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0
  });
  const { nonce } = reactExports.useContext(MotionConfigContext);
  reactExports.useInsertionEffect(() => {
    const { width, height, top, left } = size.current;
    if (isPresent || !ref.current || !width || !height)
      return;
    ref.current.dataset.motionPopId = id;
    const style = document.createElement("style");
    if (nonce)
      style.nonce = nonce;
    document.head.appendChild(style);
    if (style.sheet) {
      style.sheet.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            top: ${top}px !important;
            left: ${left}px !important;
          }
        `);
    }
    return () => {
      document.head.removeChild(style);
    };
  }, [isPresent]);
  return jsxRuntimeExports.jsx(PopChildMeasure, { isPresent, childRef: ref, sizeRef: size, children: reactExports.cloneElement(children, { ref }) });
}
const PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode }) => {
  const presenceChildren = useConstant(newChildrenMap);
  const id = reactExports.useId();
  const memoizedOnExitComplete = reactExports.useCallback((childId) => {
    presenceChildren.set(childId, true);
    for (const isComplete of presenceChildren.values()) {
      if (!isComplete)
        return;
    }
    onExitComplete && onExitComplete();
  }, [presenceChildren, onExitComplete]);
  const context = reactExports.useMemo(
    () => ({
      id,
      initial,
      isPresent,
      custom,
      onExitComplete: memoizedOnExitComplete,
      register: (childId) => {
        presenceChildren.set(childId, false);
        return () => presenceChildren.delete(childId);
      }
    }),
    /**
     * If the presence of a child affects the layout of the components around it,
     * we want to make a new context value to ensure they get re-rendered
     * so they can detect that layout change.
     */
    presenceAffectsLayout ? [Math.random(), memoizedOnExitComplete] : [isPresent, memoizedOnExitComplete]
  );
  reactExports.useMemo(() => {
    presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
  }, [isPresent]);
  reactExports.useEffect(() => {
    !isPresent && !presenceChildren.size && onExitComplete && onExitComplete();
  }, [isPresent]);
  if (mode === "popLayout") {
    children = jsxRuntimeExports.jsx(PopChild, { isPresent, children });
  }
  return jsxRuntimeExports.jsx(PresenceContext.Provider, { value: context, children });
};
function newChildrenMap() {
  return /* @__PURE__ */ new Map();
}
const getChildKey = (child) => child.key || "";
function onlyElements(children) {
  const filtered = [];
  reactExports.Children.forEach(children, (child) => {
    if (reactExports.isValidElement(child))
      filtered.push(child);
  });
  return filtered;
}
const AnimatePresence = ({ children, custom, initial = true, onExitComplete, presenceAffectsLayout = true, mode = "sync", propagate = false }) => {
  const [isParentPresent, safeToRemove] = usePresence(propagate);
  const presentChildren = reactExports.useMemo(() => onlyElements(children), [children]);
  const presentKeys = propagate && !isParentPresent ? [] : presentChildren.map(getChildKey);
  const isInitialRender = reactExports.useRef(true);
  const pendingPresentChildren = reactExports.useRef(presentChildren);
  const exitComplete = useConstant(() => /* @__PURE__ */ new Map());
  const [diffedChildren, setDiffedChildren] = reactExports.useState(presentChildren);
  const [renderedChildren, setRenderedChildren] = reactExports.useState(presentChildren);
  useIsomorphicLayoutEffect(() => {
    isInitialRender.current = false;
    pendingPresentChildren.current = presentChildren;
    for (let i = 0; i < renderedChildren.length; i++) {
      const key = getChildKey(renderedChildren[i]);
      if (!presentKeys.includes(key)) {
        if (exitComplete.get(key) !== true) {
          exitComplete.set(key, false);
        }
      } else {
        exitComplete.delete(key);
      }
    }
  }, [renderedChildren, presentKeys.length, presentKeys.join("-")]);
  const exitingChildren = [];
  if (presentChildren !== diffedChildren) {
    let nextChildren = [...presentChildren];
    for (let i = 0; i < renderedChildren.length; i++) {
      const child = renderedChildren[i];
      const key = getChildKey(child);
      if (!presentKeys.includes(key)) {
        nextChildren.splice(i, 0, child);
        exitingChildren.push(child);
      }
    }
    if (mode === "wait" && exitingChildren.length) {
      nextChildren = exitingChildren;
    }
    setRenderedChildren(onlyElements(nextChildren));
    setDiffedChildren(presentChildren);
    return;
  }
  const { forceRender } = reactExports.useContext(LayoutGroupContext);
  return jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: renderedChildren.map((child) => {
    const key = getChildKey(child);
    const isPresent = propagate && !isParentPresent ? false : presentChildren === renderedChildren || presentKeys.includes(key);
    const onExit = () => {
      if (exitComplete.has(key)) {
        exitComplete.set(key, true);
      } else {
        return;
      }
      let isEveryExitComplete = true;
      exitComplete.forEach((isExitComplete) => {
        if (!isExitComplete)
          isEveryExitComplete = false;
      });
      if (isEveryExitComplete) {
        forceRender === null || forceRender === void 0 ? void 0 : forceRender();
        setRenderedChildren(pendingPresentChildren.current);
        propagate && (safeToRemove === null || safeToRemove === void 0 ? void 0 : safeToRemove());
        onExitComplete && onExitComplete();
      }
    };
    return jsxRuntimeExports.jsx(PresenceChild, { isPresent, initial: !isInitialRender.current || initial ? void 0 : false, custom: isPresent ? void 0 : custom, presenceAffectsLayout, mode, onExitComplete: isPresent ? void 0 : onExit, children: child }, key);
  }) });
};
const RING_R = 110;
const RING_C = 2 * Math.PI * RING_R;
function BreakScreen() {
  const [payload, setPayload] = reactExports.useState(null);
  const [remainingMs, setRemainingMs] = reactExports.useState(0);
  reactExports.useEffect(() => {
    window.eyeprotector.getBreak().then((p) => {
      if (p) {
        setPayload(p);
        setRemainingMs(p.durationMs);
      }
    });
    return window.eyeprotector.onBreakStart((p) => {
      setPayload(p);
      setRemainingMs(p.durationMs);
    });
  }, []);
  reactExports.useEffect(() => {
    if (!payload) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, payload.durationMs - (Date.now() - startedAt));
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(id);
        window.eyeprotector.breakAction("complete");
      }
    }, 200);
    return () => clearInterval(id);
  }, [payload]);
  if (!payload) return null;
  const totalSec = Math.ceil(remainingMs / 1e3);
  const progress = payload.durationMs > 0 ? 1 - remainingMs / payload.durationMs : 1;
  const isLong = payload.type === "long";
  const title = isLong ? "Time for a long break" : "Look away and rest your eyes";
  const subtitle = isLong ? "Stand up, stretch, and let your eyes relax." : "Focus on something about 6 meters away for a moment.";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.div,
    {
      className: "relative flex h-full w-full flex-col items-center justify-center text-white select-none",
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.6 },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.div,
          {
            className: "absolute inset-0 -z-10",
            style: {
              backgroundImage: "radial-gradient(circle at 30% 30%, #1e3a8a, transparent 55%), radial-gradient(circle at 70% 70%, #0f766e, transparent 55%), linear-gradient(#0b1220, #0b1220)",
              backgroundSize: "200% 200%"
            },
            animate: { backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] },
            transition: { duration: 22, repeat: Infinity, ease: "linear" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-12 flex items-center justify-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "240", height: "240", className: "-rotate-90", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "120", cy: "120", r: RING_R, stroke: "rgba(255,255,255,0.15)", strokeWidth: "6", fill: "none" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "circle",
              {
                cx: "120",
                cy: "120",
                r: RING_R,
                stroke: "white",
                strokeWidth: "6",
                fill: "none",
                strokeLinecap: "round",
                strokeDasharray: RING_C,
                strokeDashoffset: RING_C * (1 - progress),
                style: { transition: "stroke-dashoffset 0.2s linear" }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              className: "absolute rounded-full bg-white/10 backdrop-blur",
              style: { width: 150, height: 150 },
              animate: { scale: [1, 1.15, 1] },
              transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute text-5xl font-light tabular-nums", children: totalSec })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.h1,
          {
            className: "text-3xl font-semibold",
            initial: { y: 12, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            transition: { delay: 0.2 },
            children: title
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-white/70", children: subtitle }),
        !payload.strict && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.div,
          {
            className: "mt-10 flex gap-4",
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { delay: 0.5 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "rounded-full bg-white/15 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25",
                  onClick: () => window.eyeprotector.breakAction("postpone"),
                  children: "Postpone 5 min"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "rounded-full bg-white/15 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25",
                  onClick: () => window.eyeprotector.breakAction("skip"),
                  children: "Skip"
                }
              )
            ]
          }
        ),
        payload.strict && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-10 text-sm text-white/40", children: "Strict break — please wait until it ends." })
      ]
    }
  ) });
}
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreakScreen, {}) })
);
