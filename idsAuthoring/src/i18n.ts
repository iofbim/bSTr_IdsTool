export const translations = {
  en: {
    nav: [
      "I of BIM",
      "What we can do",
      "Projects",
      "Contact",
      "Tools",
    ],
    tools: {
      ifcSchema: "IFC Schema",
      bep: "BEP Authoring Tool",
      ids: "IDS Authoring Tool",
    },
  },
  tr: {
    nav: [
      "I of BIM",
      "Neler yapabiliriz",
      "Projeler",
      "İletişim",
      "Araçlar",
    ],
    tools: {
      ifcSchema: "IFC Şeması",
      bep: "BEP Oluşturma Aracı",
      ids: "IDS Oluşturma Aracı",
    },
  },
} as const;

export type SupportedLang = keyof typeof translations;

