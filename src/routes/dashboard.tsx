import { createFileRoute, Link, Outlet } from "@tanstack/solid-router";
import { createSignal } from "solid-js";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div>
      <aside>
        <Link to="/dashboard">Dashboard</Link>
        <span>{" | "}</span>
        <Link to="/dashboard/settings">Settings</Link>
        <span>{" | "}</span>
        <Counter />
      </aside>
      <Outlet />
    </div>
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
