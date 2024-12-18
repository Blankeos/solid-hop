import getTitle from "@/utils/get-title";
import { useMetadata } from "vike-metadata-solid";

export default function Page() {
  useMetadata({
    title: getTitle("Dashboard"),
  });

  return (
    <>
      <div>
        <h1>This is the /dashboard</h1>
        <p>Demonstrating nested layout.</p>
      </div>
    </>
  );
}
