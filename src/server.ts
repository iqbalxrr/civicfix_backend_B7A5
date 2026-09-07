import app from "./app";
import { env } from "./config/env";

const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  app.listen(env.PORT, () => {
    console.log(`CivicFix API running on port ${env.PORT}`);
    console.log(`Health: ${env.BASE_URL}/health`);
  });
}

export default app;
