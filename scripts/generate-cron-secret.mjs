import crypto from "node:crypto";

const secret = crypto.randomBytes(24).toString("hex");

console.log("Tambahkan ke .env.local dan Vercel Environment Variables:");
console.log("");
console.log(`CRON_SECRET=${secret}`);
