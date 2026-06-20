import { createAdminClient } from "@insforge/sdk"

const projectConfig = {
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
}

export const admin = createAdminClient(projectConfig)
