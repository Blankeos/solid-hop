import { v as ssr, x as escape, a as createComponent, y as ssrHydrationKey, e as createSignal } from "../server.js";
import "node:async_hooks";
import "node:stream/web";
var _tmpl$ = ["<div", "><h1>My TanStack + Solid app</h1>This page is:<ul><li>Rendered to HTML.</li><li>Interactive. <!--$-->", "<!--/--></li><!--$-->", "<!--/--></ul></div>"], _tmpl$2 = ["<button", ' type="button">Counter <!--$-->', "<!--/--></button>"];
function Page() {
  return ssr(_tmpl$, ssrHydrationKey(), escape(createComponent(Counter, {})), escape(process.env.PORT));
}
function Counter() {
  const [count, setCount] = createSignal(0);
  return ssr(_tmpl$2, ssrHydrationKey(), escape(count()));
}
export {
  Page as component
};
