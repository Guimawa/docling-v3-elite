import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // Remplacez par votre URL de production ou l'IP locale pour le dev mobile
    // 10.0.2.2 est souvent l'adresse de l'hôte sur l'émulateur Android
    baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787",
});
