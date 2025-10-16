import { v as ssr, x as escape, a as createComponent, O as Outlet, y as ssrHydrationKey, e as createSignal } from "../server.js";
import { L as Link } from "./router-CborEPUv.js";
import "node:async_hooks";
import "node:stream/web";
var _tmpl$ = ["<div", "><aside><!--$-->", "<!--/--><span> | </span><!--$-->", "<!--/--><span> | </span><!--$-->", "<!--/--></aside><!--$-->", "<!--/--></div>"], _tmpl$2 = ["<button", ' type="button">Dashboard Counter <!--$-->', "<!--/--></button>"];
function DashboardLayout() {
  return ssr(_tmpl$, ssrHydrationKey(), escape(createComponent(Link, {
    to: "/dashboard",
    children: "Dashboard"
  })), escape(createComponent(Link, {
    to: "/dashboard/settings",
    children: "Settings"
  })), escape(createComponent(Counter, {})), escape(createComponent(Outlet, {})));
}
function Counter() {
  const [count, setCount] = createSignal(0);
  return ssr(_tmpl$2, ssrHydrationKey(), escape(count()));
}
export {
  DashboardLayout as component
};
