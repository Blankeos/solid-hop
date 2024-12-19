import { createSignal, type FlowProps } from "solid-js";

export default function SettingsLayout(props: FlowProps) {
  return (
    <div>
      <aside>
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
      Settings Counter {count()}
    </button>
  );
}
