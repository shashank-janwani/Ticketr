import { Suspense } from "react";
import Spinnner from "@/components/Spinnner";
import SearchContent from "./SearchContent";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <Spinnner />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}