import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/solid-router";
import * as Solid from "solid-js";
import { createSignal } from "solid-js";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument(props: Readonly<{ children: Solid.JSX.Element }>) {
  return (
    <>
      <HeadContent />
      <aside>
        <Link to="/">Home</Link>
        <span>{" | "}</span>
        <Link to="/dashboard">Dashboard</Link>
        <span>{" | "}</span>
        <Counter />
      </aside>

      {props.children}
      <Scripts />
    </>
  );
}

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Dashboard Counter {count()}
    </button>
  );
}
