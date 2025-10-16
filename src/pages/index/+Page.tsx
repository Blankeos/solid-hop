import { createSignal } from "solid-js"
import { useMetadata } from "vike-metadata-solid"
import getTitle from "@/utils/get-title"

export default function Page() {
  useMetadata({
    title: getTitle("Home"),
  })

  return (
    <>
      <div>
        <h1>My Vike + Solid app</h1>
        This page is:
        <ul>
          <li>Rendered to HTML.</li>
          <li>
            Interactive. <Counter />
          </li>
        </ul>
      </div>
    </>
  )
}

function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Counter {count()}
    </button>
  )
}
