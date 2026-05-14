"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type PublicBookingButtonProps = {
  callbackPath: string;
  eventId: string;
  idleLabel: string;
  pendingLabel: string;
  errorLabel: string;
};

const PublicBookingButton = ({
  callbackPath,
  eventId,
  idleLabel,
  pendingLabel,
  errorLabel,
}: PublicBookingButtonProps) => {
  const router = useRouter();
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async () => {
    setIsBooking(true);
    setError(null);

    try {
      const response = await fetch("/api/ticketing/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          eventId: Number(eventId),
          quantity: 1,
        }),
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
        return;
      }

      if (!response.ok) {
        throw new Error("booking_failed");
      }

      router.push("/reserved");
    } catch {
      setError(errorLabel);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        className="mt-6 h-12 w-full rounded-xl"
        onClick={() => void handleBook()}
        disabled={isBooking}
      >
        {isBooking ? pendingLabel : idleLabel}
      </Button>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
};

export default PublicBookingButton;
