import getTitle from "@/utils/get-title";
import { useMetadata } from "vike-metadata-solid";

export default function Page() {
  useMetadata({
    title: getTitle("Home"),
  });

  return (
    <>
      <div>
        <h1>This is the /dashboard/settings</h1>
        <p>Demonstrating nested layout.</p>
      </div>
    </>
  );
}
