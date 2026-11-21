import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "campaign-media";
export const STORAGE_PREFIX = "storage:";

/** Resolves an image reference: "storage:<path>" (private bucket, signed) or an absolute URL. */
export function useMediaUrl(ref: string | null | undefined, fallback: string): string {
  const path = ref?.startsWith(STORAGE_PREFIX) ? ref.slice(STORAGE_PREFIX.length) : null;
  const signed = useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path!, 60 * 60 * 24);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (path) return signed.data ?? fallback;
  if (ref && /^https?:\/\//.test(ref)) return ref;
  return fallback;
}
