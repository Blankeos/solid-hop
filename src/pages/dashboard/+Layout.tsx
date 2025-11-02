import { createSignal, type FlowProps } from "solid-js"
import { getRoute } from "@/route-tree.gen"

export default function DashboardLayout(props: FlowProps) {
  return (
    <div>
      <aside>
        <a href={getRoute("/dashboard")}>Dashboard</a>
        <span>{" | "}</span>
        <a href={getRoute("/dashboard/settings")}>Settings</a>
        <span>{" | "}</span>
        <Counter />
      </aside>
      {props.children}
    </div>
  )
}

function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Dashboard Counter {count()}
    </button>
  )
}
