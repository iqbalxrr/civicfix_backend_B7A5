import app from "./app";
import { env } from "./config/env";

const start = async () => {
  app.listen(env.PORT, () => {
    console.log(`CivicFix API running on port ${env.PORT}`);
    console.log(`Health: ${env.BASE_URL}/health`);
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
