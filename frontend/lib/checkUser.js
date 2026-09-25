import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";

const STRAPI_URL =
    process.env.NEXT_PUBLIC_STRAPI_URL || "https://food-backend-e25g.onrender.com";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// The Strapi user rarely changes, so keep it in memory for a minute per
// server instance instead of asking Strapi on every page and server action.
const TTL_MS = 60_000;
const users = globalThis.__servdUsers || (globalThis.__servdUsers = new Map());
const inflight = globalThis.__servdUserLoads || (globalThis.__servdUserLoads = new Map());

export function forgetCachedUser(clerkId) {
    users.delete(clerkId);
}

async function strapiHeaders() {
    return { Authorization: `Bearer ${STRAPI_API_TOKEN}` };
}

async function findUser(clerkId) {
    const res = await fetch(`${STRAPI_URL}/api/users?filters[clerkid][$eq]=${clerkId}`, {
        headers: await strapiHeaders(),
        cache: "no-store",
    });
    if (!res.ok) {
        console.error("Strapi error response", await res.text());
        throw new Error("Strapi user lookup failed");
    }
    const rows = await res.json();
    if (!rows.length) return null;
    // Because of a race condition on sign up, there might be multiple duplicate users in Strapi
    // We need to check if ANY of them are "pro"
    const isPro = rows.some((u) => u.subscriptionTier === "pro");
    return { ...rows[0], subscriptionTier: isPro ? "pro" : rows[0].subscriptionTier || "free" };
}

// Only needed the first time someone signs in.
async function createUser(clerkId) {
    const user = await currentUser();
    if (!user) return null;

    const rolesResponse = await fetch(`${STRAPI_URL}/api/users-permissions/roles`, {
        headers: await strapiHeaders(),
    });
    const rolesdata = await rolesResponse.json();
    const authenticatedRole = rolesdata.roles.find((role) => role.type === "authenticated");
    if (!authenticatedRole) {
        console.error("Authenticated roles not found");
        return null;
    }

    const email = user.emailAddresses[0].emailAddress;
    const newUserResponse = await fetch(`${STRAPI_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await strapiHeaders()) },
        body: JSON.stringify({
            username: user.username || email.split("@")[0],
            email,
            password: `clerk_managed_${clerkId}_${Date.now()}`,
            confirmed: true,
            blocked: false,
            clerkid: clerkId,
            subscriptionTier: "free",
            role: authenticatedRole.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            imageUrl: user.imageUrl || "",
        }),
    });
    if (!newUserResponse.ok) {
        console.error("Strapi Error response:", await newUserResponse.text());
        // Another request may have created the user in the meantime.
        return findUser(clerkId);
    }
    const newUser = await newUserResponse.json();
    return { ...newUser, subscriptionTier: "free" };
}

async function loadUser(clerkId) {
    return (await findUser(clerkId)) || (await createUser(clerkId));
}

// Deduped per request (React cache), per minute (memory) and across
// concurrent calls (in-flight map, which also stops duplicate sign-up rows).
export const checkUser = cache(async () => {
    // auth() reads the session token locally: no network call.
    const { userId } = await auth();
    if (!userId) return null;

    if (!STRAPI_API_TOKEN) {
        console.error("STRAPI_API_TOKEN is missing in .env.local");
        return null;
    }

    const hit = users.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.user;

    let load = inflight.get(userId);
    if (!load) {
        load = loadUser(userId).finally(() => inflight.delete(userId));
        inflight.set(userId, load);
    }
    try {
        const user = await load;
        if (user) users.set(userId, { user, at: Date.now() });
        return user;
    } catch (error) {
        console.error("Error in checkUser:", error.message);
        return hit?.user || null;
    }
});
