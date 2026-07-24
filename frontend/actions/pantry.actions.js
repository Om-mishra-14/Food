"use server";
import { checkUser } from "@/lib/checkUser";
import OpenAI from "openai";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new OpenAI();

// const response = await client.responses.create({
//   model: "gpt-4.1-nano",
//   input: "Write a one-sentence bedtime story about a unicorn.",
// });

// console.log(response.output_text);

export async function scanPantryImage(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const isPro = user.subscriptionTier == "pro";

    const imagefile = formData.get("image");

    console.log("IMAGE FROM FORM DATA:", imagefile);
    console.log("TYPE:", typeof imagefile);
    console.log("INSTANCE:", imagefile instanceof File);

    if (!imagefile) {
      throw new Error("No image provided");
    }

    if (!imagefile) {
      throw new Error("No image provided");
    }

    console.log("Image:", imagefile);
    console.log("arrayBuffer:", typeof imagefile.arrayBuffer);

    const bytes = await imagefile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    const prompt = `
You are a professional chef and ingredient recognition expert. Analyze this image of a pantry/fridge and identify all visible food ingredients.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanations):
[
  {
    "name": "ingredient name",
    "quantity": "estimated quantity with unit",
    "confidence": 0.95
  }
]

Rules:
- Only identify food ingredients (not containers, utensils, or packaging)
- Be specific (e.g., "Cheddar Cheese" not just "Cheese")
- Estimate realistic quantities (e.g., "3 eggs", "1 cup milk", "2 tomatoes")
- Confidence should be 0.7-1.0 (omit items below 0.7)
- Maximum 20 items
- Common pantry staples are acceptable (salt, pepper, oil)
`;

    const response = await client.responses.create({
      model: "gpt-4.1-nano",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${prompt}`,
            },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${base64Image}`,
            },
          ],
        },
      ],
    });

    const responseFromGpt = response.output_text;

    console.log(responseFromGpt);

    let ingredients;
    try {
      const cleanText = responseFromGpt
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      ingredients = JSON.parse(cleanText);
    } catch (error) {
      console.log("Failed to parse Gpt Response", responseFromGpt);
      throw new Error("Failed to parse ingredients. Please try again");
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error(
        "No ingredients detected in the image . Please try a cleaner photo.",
      );
    }

    return {
      success: true,
      ingredients: ingredients.slice(0, 20),
      scansLimit: isPro ? "Unlimited" : 10,
      message: `Found ${ingredients.length} ingredients! `,
    };
  } catch (error) {
    console.log("Error scanning pantry ", error);
    throw new Error(error.message || "Failed to scan image ");
  }
}

export async function saveToPantry(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const ingredientsJson = formData.get("ingredients");
    const ingredients = JSON.parse(ingredientsJson);

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingridents to save");
    }

    const savedItems = [];
    for (const ingredient of ingredients) {
      const response = await fetch(`${STRAPI_URL}/api/pantry-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            name: ingredient.name,
            quantity: ingredient.quantity,
            imageUrl: "",
            owner: user.id,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Strapi Response:", JSON.stringify(data, null, 2)); //// changes
        savedItems.push(data.data);
      }
    }

    return {
      success: true,
      savedItems,
      message: `Saved ${savedItems.length} items to your pantry!`,
    };
  } catch (error) {
    console.error("Error saving to pantry", error);
    throw new Error("error.message || Failed to save items");
  }
}

export async function addPantryItemManually(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const name = formData.get("name");
    const quantity = formData.get("quantity");

    if (!name || !quantity) {
      throw new Error("Name and quantity are required");
    }

    const response = await fetch(`${STRAPI_URL}/api/pantry-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          name: name.trim(),
          quantity: quantity.trim(),
          imageUrl: "",
          owner: user.id,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to add item:", errorText);
      throw new Error("Failed to add item to pantry");
    }

    const data = await response.json();

    return {
      success: true,
      item: data.data,
      message: "Item added successfully!",
    };
  } catch (error) {
    console.error("Error adding item manually:", error);
    throw new Error(error.message || "Failed to add item");
  }
}

export async function getPantryItems() {
  try {
    const user = await checkUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      `${STRAPI_URL}/api/pantry-items?populate=owner&sort=createdAt:desc`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch pantry items");
    }

    const data = await response.json();

    console.log("Current User ID:", user.id);
    console.log("All Pantry Items:", JSON.stringify(data.data, null, 2));
    const items = (data.data || []).filter(
      (item) => item.owner?.id === user.id,
    );

    const isPro = user.subscriptionTier === "pro";

    return {
      success: true,
      items,
      scansLimit: isPro ? "unlimited" : 10,
    };
  } catch (error) {
    console.error("Error fetching pantry:", error);
    throw new Error(error.message || "Failed to load pantry");
  }
}

export async function deletePantryItem(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const itemId = formData.get("itemId");

    const response = await fetch(`${STRAPI_URL}/api/pantry-items/${itemId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete item");
    }

    return {
      success: true,
      message: "Item removed from pantry",
    };
  } catch (error) {
    console.error("Error deleting item:", error);
    throw new Error(error.message || "Failed to delete item");
  }
}

export async function updatePantryItem(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const itemId = formData.get("itemId");
    const name = formData.get("name");
    const quantity = formData.get("quantity");

    const response = await fetch(`${STRAPI_URL}/api/pantry-items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          name,
          quantity,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update item");
    }

    const data = await response.json();

    return {
      success: true,
      item: data.data,
      message: "Item updated successfully",
    };
  } catch (error) {
    console.error("Error updating item:", error);
    throw new Error(error.message || "Failed to update item");
  }
}
