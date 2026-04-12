import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "https://docling-api.guimawa.workers.dev",
});
