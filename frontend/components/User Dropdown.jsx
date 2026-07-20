"use client";
import { UserButton } from "@clerk/nextjs";
import { CookieIcon, Refrigerator } from "lucide-react";
import React from "react";

export const UserDropdown = () => {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="My Recipes"
          labelIcon={<CookieIcon size={16} />}
          href="/recipes"
        />
        <UserButton.Link
          label="My Recipes"
          labelIcon={<Refrigerator size={16} />}
          href="/pantry"
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
    </UserButton>
  );
};
export default UserDropdown;
