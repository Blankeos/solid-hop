import { createSignal, type FlowProps } from "solid-js"
import { useMetadata } from "vike-metadata-solid"
import getTitle from "@/utils/get-title"

useMetadata.setGlobalDefaults({
  title: getTitle("Home"),
  description: "Demo showcasing Vike and Solid.",
})

export default function RootLayout(props: FlowProps) {
  return (
    <>
      <div>
        <nav>
          <a href="/">Home</a>
          <span>{" | "}</span>
          <a href="/dashboard">Dashboard</a>
          <span>{" | "}</span>
          <Counter />
        </nav>
        {props.children}
      </div>
    </>
  )
}

function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Root Counter {count()}
    </button>
  )
}
