import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  COOKIE_FILE: z.string().default("./cookie.json"),
  SEMAPHORE: z.coerce.number().default(1),
  FFMPEG_OPTION: z
    .string()
    .transform((val) => z.array(z.string()).parse(JSON.parse(val)))
    .optional(),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:");
    console.error(error);
    process.exit(1);
  }
};

export const env = parseEnv();
