"use client";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/i18n";

export const Header = () => {
  const { lang, setLang } = useLanguage();
  const t = translations[lang];

  const toggleLang = () => setLang(lang === "en" ? "tr" : "en");

  return (
    <div className="flex justify-center items-center sticky top-0 sm:fixed sm:top-3 w-full z-10 px-2">
      <nav className="flex items-center gap-1 p-0.5 border border-white/15 rounded-2xl bg-accent/60 backdrop-blur overflow-x-auto whitespace-nowrap min-w-0 max-w-full">
        <a href="/#IOB" className="ds-nav-item !px-2 !py-1 !text-[10px] md:!px-3 md:!py-1.5 md:!text-sm">
          <span className="hidden md:inline">{t.nav[0]}</span>
          <span className="md:hidden">IoB</span>
        </a>
        <a href="/#WhatWeCanDo" className="ds-nav-item !px-2 !py-1 !text-[10px] md:!px-3 md:!py-1.5 md:!text-sm">
          <span>{t.nav[1]}</span>
        </a>
        <a href="/#ProjectsSection" className="ds-nav-item !px-2 !py-1 !text-[10px] md:!px-3 md:!py-1.5 md:!text-sm">
          <span>{t.nav[2]}</span>
        </a>
        <a href="/#ContactSection" className="ds-nav-item !px-2 !py-1 !text-[10px] md:!px-3 md:!py-1.5 md:!text-sm">
          <span>{t.nav[3]}</span>
        </a>
      </nav>
      <nav className="hidden md:flex items-center mx-2 gap-1 p-1 border border-white/15 rounded-2xl bg-accent/60 backdrop-blur">
        <div className="relative group">
          <button
            type="button"
            className="ds-nav-item hidden md:block text-textMid font-bold px-3 py-1.5 rounded-xl items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <span>{t.nav[4]}</span>
          </button>
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+6px)] min-w-[150px] rounded-xl border border-white/15 bg-accent/90 backdrop-blur shadow-lg opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0"
          >
            <a href="/tools/IFC_schema" role="menuitem" className="block px-3 py-2 text-textMid hover:bg-white/10 rounded-t-xl focus:outline-none focus-visible:bg-white/15">
              {t.tools.ifcSchema}
            </a>
            <a href="/tools/bep" role="menuitem" className="block px-3 py-2 text-textMid hover:bg-white/10 focus:outline-none focus-visible:bg-white/15">
              {t.tools.bep}
            </a>
            <a href="/tools/ids" role="menuitem" className="block px-3 py-2 text-textMid hover:bg-white/10 rounded-b-xl focus:outline-none focus-visible:bg-white/15">
              {t.tools.ids}
            </a>
          </div>
        </div>
      </nav>
      <nav className="flex items-center mx-1 md:mx-2 gap-1 p-0.5 md:p-1 border border-white/15 rounded-2xl bg-accent/60 backdrop-blur">
        <button
          type="button"
          onClick={toggleLang}
          className="ds-nav-item !px-1.5 !py-0.5 !text-[10px] md:!px-3 md:!py-1.5 md:!text-sm"
        >
          <span className={lang === "en" ? "font-bold text-white" : ""}>EN</span>
          <span className="px-1">|</span>
          <span className={lang === "tr" ? "font-bold text-white" : ""}>TR</span>
        </button>
      </nav>
    </div>
  );
};

export default Header;

