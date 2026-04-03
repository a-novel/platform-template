import type { TolgeeInstance } from "@tolgee/web";

export function loadTranslations(instance: TolgeeInstance) {
  instance.addStaticData({
    "en:template.common": () => import("./tr/template.common/en.json").then((m) => m.default),
    "fr:template.common": () => import("./tr/template.common/fr.json").then((m) => m.default),
  });
}
