"use client";
import PricingSection from "./PricingSection";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import React, { useState } from "react";


const PricingModal = ({subscriptionTier = "free", children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const canOpen = subscriptionTier === "free";
  return (
    <Dialog open={isOpen} onOpenChange={canOpen ? setIsOpen : undefined}>
      <DialogTrigger render={children}></DialogTrigger>
      <DialogContent className="p-8 pt - 4 sm:max-w-4xl">
        <DialogTitle>
          <PricingSection></PricingSection>
        </DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
