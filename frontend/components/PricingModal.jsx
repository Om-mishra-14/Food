"use client";
import PricingSection from "./PricingSection";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import React, { useState } from "react";

const PricingModal = ({ subscriptionTier = "free", children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const canOpen = subscriptionTier === "free";

  return (
    <>
      <span
        onClick={() => canOpen && setIsOpen(true)}
        style={{ cursor: canOpen ? "pointer" : "default" }}
      >
        {children}
      </span>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-6 sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Upgrade to Pro</DialogTitle>
          <PricingSection subscriptionTier={subscriptionTier} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PricingModal;
