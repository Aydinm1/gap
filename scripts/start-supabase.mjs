import { spawnSync } from "node:child_process";

const result = spawnSync("supabase", [
  "start", "-x",
  "realtime,imgproxy,edge-runtime,logflare,vector,supavisor,studio,mailpit",
], { stdio: "inherit", env: process.env });

if (result.error) console.error("Unable to start local Supabase:", result.error.message);
process.exit(result.status ?? 1);
