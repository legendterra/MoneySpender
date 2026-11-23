import { redirect } from "next/navigation";

// "/" has no landing page in v2; next.config.ts redirects it too.
export default function HomePage() {
  redirect("/dashboard");
}
