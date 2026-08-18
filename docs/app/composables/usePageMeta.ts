// The tags that describe one page, in one call.
//
// `useSeoMeta` does not derive the Open Graph pair from `title` and
// `description`, and a crawler falling back to `<title>` is luck rather than a
// contract — a shared link showed the site-wide default instead of the page.
// Both pairs are set here so every page carries its own, while the image and
// the card type stay the site-wide ones from `nuxt.config`.
export const usePageMeta = (meta: {
  title?: string;
  description?: string;
}) => {
  useSeoMeta({
    title: meta.title,
    description: meta.description,
    ogTitle: meta.title,
    ogDescription: meta.description,
    twitterTitle: meta.title,
    twitterDescription: meta.description,
  });
};
