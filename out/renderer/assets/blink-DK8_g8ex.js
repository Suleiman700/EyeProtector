import { r as reactExports, j as jsxRuntimeExports, c as createRoot, R as React } from "./client-Cd8D_Os3.js";
import { m as motion } from "./proxy-EwNnx6yi.js";
function BlinkScreen() {
  reactExports.useEffect(() => {
    let timer;
    window.eyeprotector.getSettings().then((s) => {
      timer = setTimeout(() => window.eyeprotector.blinkDone(), s.blink.durationSec * 1e3);
    });
    return () => clearTimeout(timer);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full w-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.div,
    {
      className: "flex flex-col items-center",
      initial: { scale: 0.92, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.div,
          {
            animate: { y: [0, -7, 0] },
            transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "svg",
              {
                width: "240",
                height: "200",
                viewBox: "0 0 240 200",
                style: { filter: "drop-shadow(0 10px 32px rgba(7,17,32,0.55))" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { className: "blink-eye", x: "62", y: "38", width: "34", height: "84", rx: "17", fill: "#F8FAFC" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { className: "blink-eye", x: "144", y: "38", width: "34", height: "84", rx: "17", fill: "#F8FAFC" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M 88 152 Q 120 176 152 152",
                      fill: "none",
                      stroke: "#F8FAFC",
                      strokeWidth: "11",
                      strokeLinecap: "round"
                    }
                  )
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-3 text-4xl font-light tracking-wide text-white",
            style: {
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
              textShadow: "0 2px 16px rgba(7,17,32,0.6)"
            },
            children: "Blink"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs font-medium uppercase tracking-[0.25em] text-white/60", children: "rest your eyes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35", children: "esc to dismiss" })
      ]
    }
  ) });
}
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BlinkScreen, {}) })
);
