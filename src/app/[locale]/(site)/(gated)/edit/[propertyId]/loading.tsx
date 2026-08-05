import { PostFormSkeleton } from "@/features/post/components/post-form-skeleton";

// The edit route renders the same form, so it gets the same fallback.
export default function EditLoading() {
  return <PostFormSkeleton />;
}
