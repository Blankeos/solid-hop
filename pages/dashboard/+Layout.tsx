import { createSignal, type FlowProps } from "solid-js";

export default function DashboardLayout(props: FlowProps) {
  return (
    <div>
      <aside>
        <a href="/dashboard">Profile</a>
        <a href="/dashboard/settings">Settings</a>
        <Counter />
      </aside>
      {props.children}
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
