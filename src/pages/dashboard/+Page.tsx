import { useMetadata } from "vike-metadata-solid"
import getTitle from "@/utils/get-title"

export default function Page() {
  useMetadata({
    title: getTitle("Dashboard"),
  })

  return (
    <>
      <div>
        <h1>This is the /dashboard</h1>
        <p>Demonstrating nested layout.</p>
      </div>
    </>
  )
}
