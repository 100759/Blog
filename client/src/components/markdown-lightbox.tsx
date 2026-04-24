import Lightbox, { type SlideImage } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export function MarkdownLightbox({
  index,
  slides,
  open,
  close,
}: {
  index: number;
  slides?: SlideImage[];
  open: boolean;
  close: () => void;
}) {
  return (
    <Lightbox
      plugins={[Download, Zoom, Counter]}
      index={index}
      slides={slides}
      open={open}
      close={close}
    />
  );
}
