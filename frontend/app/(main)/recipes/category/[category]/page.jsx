"use client";

import { getMealsByCategory } from "@/actions/mealdb.actions";
import RecipeGrid from "@/components/RecipeGrid";
import { useParams } from "next/navigation";

export default function CategoryRecipepage(){
    const params = useParams();
    const category = params.category;

    return(
        <RecipeGrid
            type = "category"
            value = {category}
            fetchAction = {getMealsByCategory}
            backLink="/dashboard"       
        />
    );
}