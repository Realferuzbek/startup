import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru"],
  defaultLocale: "uz",
  // "always" prefixes every path with the locale, including the default. This
  // is what makes a request to "/" redirect to "/uz".
  localePrefix: "always",
});
