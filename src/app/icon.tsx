import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default async function Icon() {
  const icon = await readFile(join(process.cwd(), "public", "icon-route.png"));

  return new Response(icon, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
