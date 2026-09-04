import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useActiveProfile } from "@/lib/profile-store";

export function useRequireProfile() {
  const navigate = useNavigate();
  const { profile, profiles, isLoading, select } = useActiveProfile();

  useEffect(() => {
    if (isLoading || profile) return;
    if (profiles.length === 1 && profiles[0]) {
      select(profiles[0].id);
      return;
    }
    navigate({ to: "/perfis", replace: true });
  }, [isLoading, profile, profiles, select, navigate]);

  return { profile, isLoading };
}
