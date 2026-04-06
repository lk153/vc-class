import { useEffect, useState } from "react";

type MediaFields = {
  contentMediaUrl?: string | null;
  contentMediaType?: string | null;
  answer1MediaUrl?: string | null;
  answer2MediaUrl?: string | null;
  answer3MediaUrl?: string | null;
  answer4MediaUrl?: string | null;
};

/**
 * Preloads images and audio for a question so they're cached before display.
 * Returns isReady = true when all assets are loaded or if there's nothing to load.
 */
export function useMediaPreloader(question: MediaFields | null) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!question) {
      setIsReady(true);
      return;
    }

    const urls: { url: string; type: string }[] = [];

    if (question.contentMediaUrl && question.contentMediaType) {
      urls.push({ url: question.contentMediaUrl, type: question.contentMediaType });
    }
    for (const url of [question.answer1MediaUrl, question.answer2MediaUrl, question.answer3MediaUrl, question.answer4MediaUrl]) {
      if (url) urls.push({ url, type: "image" }); // answer media preloaded as image by default
    }

    if (urls.length === 0) {
      setIsReady(true);
      return;
    }

    let loaded = 0;
    const total = urls.length;
    let cancelled = false;

    function check() {
      loaded++;
      if (!cancelled && loaded >= total) setIsReady(true);
    }

    for (const { url, type } of urls) {
      if (type === "image") {
        const img = new Image();
        img.onload = check;
        img.onerror = check;
        img.src = url;
      } else if (type === "audio") {
        const audio = new Audio();
        audio.oncanplay = check;
        audio.onerror = check;
        audio.preload = "auto";
        audio.src = url;
      } else {
        // video — don't preload, too heavy
        check();
      }
    }

    return () => { cancelled = true; };
  }, [question?.contentMediaUrl, question?.answer1MediaUrl, question?.answer2MediaUrl, question?.answer3MediaUrl, question?.answer4MediaUrl]);

  // Reset when question changes
  useEffect(() => {
    setIsReady(false);
  }, [question?.contentMediaUrl, question?.answer1MediaUrl]);

  return { isReady };
}
