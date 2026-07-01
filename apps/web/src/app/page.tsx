import { cookies } from "next/headers";

import { ONBOARDING_COOKIE } from "@/features/ui/onboarding-cookie";
import { HomeClient } from "./home-client";

export default async function Home() {
  const cookieStore = await cookies();
  const initialOnboardingComplete = cookieStore.get(ONBOARDING_COOKIE)?.value === "1";
  return <HomeClient initialOnboardingComplete={initialOnboardingComplete} />;
}