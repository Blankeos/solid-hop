import { createFileRoute } from "@tanstack/solid-router";
import { createSignal } from "solid-js";

export const Route = createFileRoute("/")({
  component: Page,
});

function Page() {
  return (
    <>
      <div>
        <h1>My TanStack + Solid app</h1>
        This page is:
        <ul>
          <li>Rendered to HTML.</li>
          <li>
            Interactive. <Counter />
          </li>
          {process.env.PORT}
        </ul>
      </div>
    </>
  );
}

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Counter {count()}
    </button>
  );
}
