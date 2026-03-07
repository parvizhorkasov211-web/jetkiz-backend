"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Layout;
const layout_20_1 = require("@/components/layouts/layout-20");
const react_1 = require("react");
const screen_loader_1 = require("@/components/screen-loader");
const auth_1 = require("@/lib/auth");
function Layout({ children }) {
    const [ready, setReady] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const token = (0, auth_1.getToken)();
        if (!token) {
            window.location.href = "/login";
            return;
        }
        setReady(true);
    }, []);
    if (!ready)
        return <screen_loader_1.ScreenLoader />;
    return <layout_20_1.Layout20>{children}</layout_20_1.Layout20>;
}
//# sourceMappingURL=layout.js.map