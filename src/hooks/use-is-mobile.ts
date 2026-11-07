import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

// サーバーでは画面幅が分からないので、PC として描いてから表示後に合わせる
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}
