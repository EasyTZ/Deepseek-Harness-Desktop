window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-ui-balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		const NS = "balance";

		const zh = {
			"balance.label": "余额",
			"balance.loading": "余额加载中…",
			"balance.error": "余额查询失败",
			"balance.unavailable": "账户不可用"
		};
		const en = {
			"balance.label": "Balance",
			"balance.loading": "Loading balance…",
			"balance.error": "Failed to load balance",
			"balance.unavailable": "Account unavailable"
		};

		const css = ".dsbBal{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}.dsbBal .dsbBalValue{color:var(--dsw-alias-label-secondary)}.dsbBal .dsbBalErr{color:var(--dsw-alias-state-error-primary)}";
		const tagId = "@deepseek-ai/dsh-ui-balance/balance.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-ui-balance";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		// 渲染某一条余额（balance_infos 里的一项）。
		function renderInfo(t, info) {
			const value = info.total_balance ?? info.topped_up_balance;
			const currency = info.currency ?? "";
			return react_jsx_runtime.jsx("span", {
				className: "dsbBalValue",
				children: `${currency} ${value}`
			}, info.currency + ":" + String(value));
		}

		function BalanceTail({ t }) {
			const [view, setView] = react.useState({ status: "loading", value: null, error: null });

			react.useEffect(() => {
				let alive = true;
				fetch("/api/balance").then((res) => res.json()).then((result) => {
					if (!alive) return;
					if (!result || !result.ok) {
						setView({ status: "error", value: null, error: result?.error?.message ?? "failed" });
						return;
					}
					setView({ status: "ready", value: result.value, error: null });
				}).catch((err) => {
					if (alive) setView({ status: "error", value: null, error: String(err) });
				});
				return () => {
					alive = false;
				};
			}, []);

			if (view.status === "loading") {
				return react_jsx_runtime.jsx("div", { className: "dsbBal", children: t("balance.loading") });
			}
			if (view.status === "error") {
				return react_jsx_runtime.jsxs("div", { className: "dsbBal", children: [
					react_jsx_runtime.jsx("span", { children: t("balance.label") }),
					react_jsx_runtime.jsx("span", { className: "dsbBalErr", children: t("balance.error") })
				] });
			}
			const data = view.value ?? {};
			const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
			if (infos.length === 0) {
				return react_jsx_runtime.jsxs("div", { className: "dsbBal", children: [
					react_jsx_runtime.jsx("span", { children: t("balance.label") }),
					react_jsx_runtime.jsx("span", { className: "dsbBalValue", children: t("balance.unavailable") })
				] });
			}
			return react_jsx_runtime.jsxs("div", { className: "dsbBal", children: [
				react_jsx_runtime.jsx("span", { children: t("balance.label") }),
				...infos.map((info) => renderInfo(t, info))
			] });
		}

		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-balance: dictionaries");
			ctx.slots.inject("conversation.chat.turnTail", () => {
				const dispose = ctx.slots.register({
					name: "conversation.chat.turnTail",
					id: "balance",
					select: () => ({}),
					locale: NS,
					inject: () => ({})
				}, BalanceTail);
				return () => dispose();
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
