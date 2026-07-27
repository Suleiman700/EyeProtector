import { r as reactExports, j as jsxRuntimeExports, c as createRoot, R as React } from "./client-Cd8D_Os3.js";
function useSettings() {
  const [settings, setSettings] = reactExports.useState(null);
  reactExports.useEffect(() => {
    window.eyeprotector.getSettings().then(setSettings);
  }, []);
  const update = (patch) => {
    window.eyeprotector.setSettings(patch).then(setSettings);
  };
  return { settings, update };
}
function App() {
  const { settings, update } = useSettings();
  const [status, setStatus] = reactExports.useState(null);
  reactExports.useEffect(() => window.eyeprotector.onStatus(setStatus), []);
  if (!settings) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-slate-900" });
  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1e3));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-slate-900 p-8 text-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-lg space-y-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "EyeProtector" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-slate-800 px-3 py-1 text-sm tabular-nums", children: [
        "Next break ",
        status ? mmss(status.msUntilNext) : "—"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Blink reminder", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Toggle,
        {
          label: "Enable blink reminders",
          checked: settings.blink.enabled,
          onChange: (v) => update({ blink: { ...settings.blink, enabled: v } })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        NumberField,
        {
          label: "Remind every (minutes)",
          value: settings.blink.intervalMin,
          onChange: (v) => update({ blink: { ...settings.blink, intervalMin: v } })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-teal-400",
          onClick: () => window.eyeprotector.takeBlinkNow(),
          children: "Preview blink"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Short break (eye rest)", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        NumberField,
        {
          label: "Every (minutes)",
          value: settings.short.intervalMin,
          onChange: (v) => update({ short: { ...settings.short, intervalMin: v } })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        NumberField,
        {
          label: "For (seconds)",
          value: settings.short.durationSec,
          onChange: (v) => update({ short: { ...settings.short, durationSec: v } })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Toggle,
        {
          label: "Strict (cannot skip)",
          checked: settings.short.strict,
          onChange: (v) => update({ short: { ...settings.short, strict: v } })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Long break (get up)", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        NumberField,
        {
          label: "Every (minutes)",
          value: settings.long.intervalMin,
          onChange: (v) => update({ long: { ...settings.long, intervalMin: v } })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        NumberField,
        {
          label: "For (seconds)",
          value: settings.long.durationSec,
          onChange: (v) => update({ long: { ...settings.long, durationSec: v } })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Toggle,
        {
          label: "Strict (cannot skip)",
          checked: settings.long.strict,
          onChange: (v) => update({ long: { ...settings.long, strict: v } })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-900 transition hover:bg-teal-400",
        onClick: () => window.eyeprotector.takeBreakNow(),
        children: "Take a break now"
      }
    )
  ] }) });
}
function Section(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3 rounded-xl bg-slate-800/60 p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-medium", children: props.title }),
    props.children
  ] });
}
function NumberField(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-slate-300", children: props.label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        min: 1,
        className: "w-24 rounded-md bg-slate-900 px-3 py-1 text-right",
        value: props.value,
        onChange: (e) => props.onChange(Math.max(1, Number(e.target.value)))
      }
    )
  ] });
}
function Toggle(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-slate-300", children: props.label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "checkbox",
        checked: props.checked,
        onChange: (e) => props.onChange(e.target.checked)
      }
    )
  ] });
}
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
