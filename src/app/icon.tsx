import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, rgba(199,224,255,1), rgba(37,81,200,1) 72%)",
          borderRadius: 128,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 256,
            height: 256,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 72,
            background: "rgba(255,255,255,0.9)",
            color: "#2451C8",
            fontSize: 134,
            fontWeight: 800,
          }}
        >
          M
        </div>
      </div>
    ),
    size,
  );
}
