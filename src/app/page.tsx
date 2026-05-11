import { redirect } from "next/navigation";

export default function HomePage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ?? "restaurante-demo";
  redirect(`/${slug}`);
}
