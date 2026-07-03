import { ImageResponse } from "next/og";

export const alt = "MoneySpender — catat uang masuk, uang keluar, dan hutang";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f1115 0%, #1a2233 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#3f7cff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: "44px", fontWeight: 700 }}>MoneySpender</div>
        </div>
        <div style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.15, maxWidth: "980px" }}>
          Catat uang masuk, uang keluar, dan hutang tanpa drama.
        </div>
        <div style={{ marginTop: "32px", fontSize: "30px", color: "#9fb0c9" }}>
          money.moneyspender.net
        </div>
      </div>
    ),
    size,
  );
}
