import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast bg-white text-grayscale-600 border-grayscale-200 shadow-lg rounded-xl",
          description: "text-grayscale-400",
          actionButton: "bg-blue-base text-white",
          cancelButton: "bg-grayscale-100 text-grayscale-500",
          success: "border-green-500 text-green-600",
          error: "border-feedback-danger text-feedback-danger",
        },
      }}
    />
  );
}