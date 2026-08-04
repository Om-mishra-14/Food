import { currentUser } from "@clerk/nextjs/server";

const STRAPI_URL = 
    process.env.NEXT_PUBLIC_STRAPI_URL || "https://food-backend-e25g.onrender.com";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export const checkUser = async() => {
    const user = await currentUser();

    if(!user){
        console.log("No User Found");
        return null;
    }

    if(!STRAPI_API_TOKEN){
        console.error("STRAPI_API_TOKEN is missing in .env.local");
        return null;
    }

    try {
        // Check if user exists in Strapi
        const existingUserResponse = await fetch(
            `${STRAPI_URL}/api/users?filters[clerkid][$eq]=${user.id}`,
            {
                headers: {
                    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
                },
                cache: "no-store",
            }
        );

        if(!existingUserResponse.ok){
            const errorText = await existingUserResponse.text();
            console.error("Strapi error response", errorText);
            return null;
        }

        const existingUserData = await existingUserResponse.json();

        if (existingUserData.length > 0){
            const existingUser = existingUserData[0];
            // Read subscriptionTier directly from Strapi — Razorpay webhook sets this to "pro"
            const subscriptionTier = existingUser.subscriptionTier || "free";
            return { ...existingUser, subscriptionTier };
        }

        // Create new user in Strapi (always starts on "free")
        const rolesResponse = await fetch(
            `${STRAPI_URL}/api/users-permissions/roles`,
            {
                headers: {
                    Authorization: `Bearer ${STRAPI_API_TOKEN}`, 
                },
            }
        );

        const rolesdata = await rolesResponse.json();
        const authenticatedRole = rolesdata.roles.find(
            (role) => role.type === "authenticated"
        );

        if(!authenticatedRole){
            console.error("Authenticated roles not found");
            return null;
        }

        const userdata = {
            username:
                user.username || user.emailAddresses[0].emailAddress.split("@")[0],
            email: user.emailAddresses[0].emailAddress,
            password: `clerk_managed_${user.id}_${Date.now()}`,
            confirmed: true,
            blocked: false, 
            clerkid: user.id,
            subscriptionTier: "free",
            role: authenticatedRole.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            imageUrl: user.imageUrl || "",
        };

        const newUserResponse = await fetch(`${STRAPI_URL}/api/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            body: JSON.stringify(userdata),
        });

        if(!newUserResponse.ok){
            const errorText = await newUserResponse.text();
            console.error("Strapi Error response:", errorText);
            return null;
        }

        const newUser = await newUserResponse.json();
        return { ...newUser, subscriptionTier: "free" };

    } catch (error) {
        console.error("Error in checkUser:", error.message);
        return null;
    }
};