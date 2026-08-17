/* =============================================================================
   SITE CONFIGURATION  —  EDIT EVERYTHING HERE
   -----------------------------------------------------------------------------
   This is the single source of truth for the whole website.
   Change text, colors, contact details, the 3D scene and ALL projects from here.
   Nothing in the HTML needs to be touched to rebrand or add a project.

   Quick map:
     theme   -> brand colors + fonts (change "navy"/"gold" to recolor the site)
     brand   -> company name, logo text, tagline
     nav     -> top navigation links
     hero    -> first screen headline / summary / call-to-actions / stats
     scene   -> the 3D night-house animation (lights, car, speed...)
     about   -> "about the company" section
     portfolio -> heading + the PROJECTS array (each becomes a card + a page)
     contact / footer -> bottom of the site
   ========================================================================== */

window.SITE_CONFIG = {

  /* ---------------------------------------------------------------------------
     1) THEME — change the main colors of the whole site here.
        These are injected as CSS variables, so every section updates at once.
     ------------------------------------------------------------------------ */
  theme: {
    colors: {
      bg:        "#04060C", // page background (rich black)
      bgElevated:"#0A1530", // cards / elevated surfaces (deep navy)
      navy:      "#0D2150", // ← MAIN BRAND COLOR (rich royal navy)
      navyLight: "#1B3F86", // electric deep-blue for gradients / glow / accents
      gold:      "#D4A95C", // ← ACCENT (warm rich gold)
      goldSoft:  "#F1D7A0", // light champagne gold for glows / highlights
      text:      "#EDF2FA", // primary text
      muted:     "#97AAC6", // secondary text (bluish to match navy)
      line:      "rgba(212,169,92,0.20)" // hairline borders
    },

    // LIGHT THEME — overrides applied when the user flips the toggle.
    // White background; the accent (buttons, eyebrows) becomes deep navy.
    light: {
      bg:        "#FFFFFF", // white page background
      bgElevated:"#F2F5FA", // cards / elevated surfaces
      navy:      "#0D2150", // brand navy (kept)
      navyLight: "#1B3F86",
      gold:      "#0D2150", // ACCENT → deep navy (buttons, highlights)
      goldSoft:  "#21407E", // lighter navy for hovers / glows
      text:      "#0D1B2E", // near-navy text
      muted:     "#566179", // muted slate
      line:      "rgba(13,33,80,0.16)" // navy hairline borders
    },
    fonts: {
      // Loaded from Google Fonts in the HTML <head>.
      // To use different fonts: change these AND the <link> in index.html / project.html.
      display: "'Fraunces', serif",   // headings — modern editorial serif
      body:    "'Manrope', sans-serif" // everything else — clean premium sans
    }
  },

  /* ---------------------------------------------------------------------------
     2) BRAND
     ------------------------------------------------------------------------ */
  brand: {
    name: "Promtech",          // text fallback (used if no logo image is set)
    nameAccent: "Group",       // colored part of the text fallback
    // HEADER LOGO — set the image source here. Leave logo "" to use the text name.
    logo:      "assets/img/logo.svg",        // shown on the DARK theme (and as default)
    logoLight: "assets/img/logo-light.svg",  // shown on the LIGHT theme (optional; falls back to logo)
    logoAlt:   "Promtech Group",             // accessible alt text
    logoHeight: 26,                          // rendered logo height in px
    tagline: "Architecture & Construction",
    year: 2026
  },

  /* ---------------------------------------------------------------------------
     3) NAVIGATION (anchors on the home page)
     ------------------------------------------------------------------------ */
  nav: [
    { label: "Главная",      href: "#home" },
    { label: "О компании",     href: "#about" },
    { label: "Проекты",  href: "#portfolio" },
    { label: "Связаться",   href: "#contact" }
  ],
  navCta: { label: "Заказать проект", href: "#contact" },

  /* ---------------------------------------------------------------------------
     4) HERO — first screen. Quick summary of the company sits over the 3D scene.
     ------------------------------------------------------------------------ */
  hero: {
    eyebrow: "Группа компаний «Промтехнология»",
    titleLines: ["Мы создаем", "будущее, которое", "вдохновляет."],
    summary:
      "Разрабатываем проекты, которые объединяют архитектуру и инженерную точность. " +
      "Продумываем каждую деталь, чтобы создавать пространства, отвечающие современным " +
      "требованиям качества, комфорта и долговечности.",
    primaryCta:   { label: "Наши проекты", href: "#portfolio" },
    secondaryCta: { label: "Написать нам",    href: "#contact" },
    stats: [
      { value: 12,  suffix: "+",  label: "Лет на рынке" },
      { value: 142, suffix: "",   label: "Объекта в эксплуатации" },
      { value: 38,  suffix: "+",   label: "Городов" },
      { value: 100, suffix: "%",  label: "пост параметр" }
    ]
  },

  /* ---------------------------------------------------------------------------
     5) HERO 3D SCENE — a glass cube with a technical "build" process inside.
        A wireframe structure draws itself floor-by-floor (tech drawing),
        nodes light up, and data pulses travel through it (graph animation).
        Framed on the RIGHT side of the hero, kept fully in view.
     ------------------------------------------------------------------------ */
  scene: {
    enabled: true,
    autoRotate: true,    // the cube slowly turns
    rotateSpeed: 0.10,   // turn speed
    drawSeconds: 6,      // time for the wireframe to draw itself
    holdSeconds: 2.2,    // pause once fully drawn, before it loops
    pulses: 4,           // number of travelling data pulses
    intensity: 1.0       // overall glow brightness (0.6 – 1.4)
  },

  /* ---------------------------------------------------------------------------
     5b) CUSTOM CURSOR — glass pointer (desktop only). Set enabled:false to disable.
     ------------------------------------------------------------------------ */
  cursor: { enabled: true },

  /* ---------------------------------------------------------------------------
     6) ABOUT
     ------------------------------------------------------------------------ */
  about: {
    eyebrow: "О компании",
    title: "Сдержанное мастерство, вне времени.",
    paragraphs: [
      "Основанная в 2014 году, наша компания начала свой путь с небольших архитектурных " +
      "и инженерных проектов, объединяя опыт специалистов, для которых качество и внимание к деталям " +
      "всегда были главным приоритетом. За годы работы мы сформировали команду профессионалов, способную решать задачи различной сложности — от частных объектов до крупных коммерческих и общественных зданий.",
      "" +
      "Мы убеждены, что качественный проект — это основа успешного строительства, " +
      "поэтому сопровождаем каждый объект с максимальной ответственностью на всех этапах его реализации."
    ],
    // Two call-to-action buttons shown under the About copy (replaces the old
    // "деятельность" grid). Identical to the two hero buttons:
    //   style: "primary" -> filled gold button (with arrow)
    //   style: "ghost"   -> outline button (no arrow)
    links: [
      { label: "Лицензии",     href: "licenses.html", style: "primary" },
      { label: "Деятельность", href: "specs.html",    style: "ghost" }
    ],
    image: "./assets/models/hq.png"
  },

  /* ---------------------------------------------------------------------------
     6b) LICENSES PAGE  (licenses.html)
         - headline + description on the left, minimalist 3D building on the right
         - a document viewer: big preview (left) + selectable list (right)
         Put the licence images in  assets/licenses/  (PNG / JPEG supported).
     ------------------------------------------------------------------------ */
  licenses: {
    eyebrow: "Разрешительная документация",
    title: "Лицензии и допуски",
    description:
      "Все виды работ выполняются на основании действующих лицензий, свидетельств " +
      "и допусков саморегулируемых организаций. Ниже — актуальный пакет разрешительных " +
      "документов компании.",
    // Block between the header and the documents: description (left) + photo
    // gallery (right, reuses the project gallery). Gallery images can be any
    // PNG / JPEG; drop them in  assets/licenses/programs/  (missing files fall
    // back to a branded placeholder).
    programs: {
      eyebrow: "Программное обеспечение",
      title: "Лицензионные программы",
      paragraphs: [
        "Проектирование и расчёты выполняются исключительно в лицензионном " +
        "программном обеспечении. Это гарантирует корректность моделей, соответствие " +
        "нормативам и юридическую чистоту передаваемой документации.",
        "В работе мы используем актуальные версии профессиональных САПР и BIM-систем " +
        "для архитектурного, конструктивного и инженерного разделов проекта."
      ],
      gallery: [
        "assets/licenses/programs/autocad.jpg",
        "assets/licenses/programs/revit.jpg",
        "assets/licenses/programs/lira.jpg",
        "assets/licenses/programs/nanocad.jpg"
      ]
    },
    docsTitle: "Документы",
    // Each document is a single image (scan / photo). Add as many as you need.
    documents: [
      { title: "Свидетельство СРО (проектирование)", src: "assets/licenses/sro-project.jpg" },
      { title: "Свидетельство СРО (строительство)",   src: "assets/licenses/sro-build.jpg" },
      { title: "Лицензия МЧС",                          src: "assets/licenses/mchs.jpg" },
      { title: "Допуск к особо опасным объектам",       src: "assets/licenses/hazard.jpg" }
    ]
  },

  /* ---------------------------------------------------------------------------
     6c) SPECS / ACHIEVEMENTS PAGE  (specs.html)
         - headline + description on the left, animated checklist on the right
         - company specifications list
         - an achievements viewer: big preview (left) + selectable list (right)
         Put the achievement images in  assets/achievements/  (PNG / JPEG).
     ------------------------------------------------------------------------ */
  specs: {
    eyebrow: "Деятельность компании",
    title: "Показатели и достижения",
    description:
      "Полный цикл работ — от инженерных изысканий и проектирования до строительства " +
      "и сдачи объекта в эксплуатацию. Мы отвечаем за каждый этап и подтверждаем качество " +
      "результатами и наградами.",
    // Short phrases animated as a check-list on the right of the header.
    checklist: [
      "Инженерные изыскания",
      "Проектирование",
      "Строительство",
      "Сдача под ключ"
    ],
    // Text-only paragraph shown after the header, before the key specs.
    // May be a single string or an array of paragraphs.
    overview: [
      "Наша компания занимается проектированием зданий, которые будут соответствовать нормативно-правовым актам, желаниям заказчика, гармонично впишутся в архитектуру города. «Промтехнология» гарантирует качественное и надёжное сотрудничество." +
      " Наша организация имеет опыт проектироания уникальных объектов как на территории России, так и в странах СНГ (Казахстан)" +
      "объединяем инженерный опыт, современные технологии и внимание к деталям, " +
      "чтобы каждый проект был выполнен качественно и в срок."
    ],

    // Block after the overview: description (left) + photo library (right,
    // reuses the project gallery). Images can be any PNG / JPEG; drop them in
    // assets/specs/ai/ (missing files fall back to a branded placeholder).
    ai: {
      eyebrow: "Технологии",
      title: "Внедрение ИИ в проектирование",
      paragraphs: [
        "Мы внедряем инструменты искусственного интеллекта в процесс проектирования: " +
        "генеративные планировки, автоматизированную проверку решений на соответствие " +
        "нормативам и ускоренный расчёт вариантов. Это сокращает сроки и повышает точность.",
        "ИИ помогает нашим инженерам сосредоточиться на творческих и ответственных задачах, " +
        "оставляя рутинные операции автоматизированным алгоритмам."
      ],
      gallery: [
        "assets/specs/ai/ai-1.jpg",
        "assets/specs/ai/ai-2.jpg",
        "assets/specs/ai/ai-3.jpg",
        "assets/specs/ai/ai-4.jpg"
      ]
    },
    specsTitle: "Ключевые показатели",
    // Company specifications — label / value rows.
    items: [
      { label: "Год основания",              value: "2014" },
      { label: "Объектов в эксплуатации",    value: "142" },
      { label: "Городов присутствия",        value: "38+" },
      { label: "Специалистов в штате",       value: "60+" },
      { label: "Сфера деятельности",         value: "Проектирование и строительство" },
      { label: "География работ",            value: "По всей России" }
    ],
    achievementsTitle: "Награды и достижения",
    // Each achievement is a single image (diploma / certificate / award).
    achievements: [
      { title: "Диплом за качество строительства", src: "assets/achievements/quality.jpg" },
      { title: "Благодарственное письмо",           src: "assets/achievements/thanks.jpg" },
      { title: "Сертификат ISO 9001",               src: "assets/achievements/iso-9001.jpg" }
    ]
  },

  /* ---------------------------------------------------------------------------
     7) PORTFOLIO + PROJECTS
        Each project becomes:  a card on the home page  +  a full detail page
        opened at  project.html?id=<id>
        ------------------------------------------------------------------------
        Per project fields:
          id        unique slug (used in the URL) — keep it url-safe
          title, category, year, location, status
          summary   one line shown on the card
          thumb     card image
          heroType  "image" or "video"   ← full-width thumbnail on the project page
          heroSrc   image url, OR mp4 url when heroType is "video"
          heroPoster poster image for video (optional)
          intro     lead paragraph on the project page
          description  array of paragraphs
          facts     small highlight stats (shown as cards)
          specs     rows for the SPECIFICATIONS table  [{label, value}]
          gallery   array of image urls
          services  list of what we did
     ------------------------------------------------------------------------ */
  portfolio: {
    eyebrow: "Портфолио",
    title: "Проекты",
    subtitle: "Пространства, где инженерная точность встречается с эстетикой. Приглашаем изучить проектные решения для жилых, коммерческих и общественных объектов, разработанные НПП «Промтехнология».",
    filtersEnabled: true
  },

  projects: [
        {
      id: "bof-birds",
      title: "ЖК «Птицы»",
      category: "Жилые здания",
      year: "2027",
      location: "г. Оренбург, Россия",
      status: "Идет проектирование",
      summary: "A Victorian terrace stripped back, rebuilt and quietly extended.",
      thumb: "./assets/projects/bof-birds/th.jpg",
      heroType: "image",
      heroSrc: "./assets/projects/bof-birds/render1.jpeg",
      intro:
        "A full renovation of a four-storey Victorian terrace — new structure behind a retained facade, " +
        "a basement dig, and a glazed rear extension opening to the garden.",
      description: [
        "Currently on site. We are underpinning the original walls, forming a new basement level, and " +
        "rebuilding the interior around a top-lit central stair, all while preserving the protected street frontage.",
        "Completion is scheduled for late 2025."
      ],
      facts: [
        { value: "4",  label: "storeys" },
        { value: "+1", label: "new basement" },
        { value: "2025", label: "completion" }
      ],
      specs: [
        { label: "Project type",  value: "Renovation + extension" },
        { label: "Floor area",    value: "390 m² (after works)" },
        { label: "Works",         value: "Underpinning, basement, rear extension" },
        { label: "Heritage",      value: "Facade retention" },
        { label: "Duration",      value: "Est. 15 months (2024–2025)" },
        { label: "Status",        value: "On site" }
      ],
      services: ["Architecture", "Structural engineering", "Main contractor"],
      gallery: [
        "https://picsum.photos/seed/elm-g1/1200/800",
        "https://picsum.photos/seed/elm-g2/1200/800"
      ]
    },
      {
      id: "bof-muravlenko",
      title: "Жилой комплекс «Арктик»",
      category: "Жилые здания",
      year: "2026",
      location: "г. Муравленко, Россия",
      status: "Строится",
      summary: "A waterfront restaurant under a single folded-concrete roof.",
      thumb: "./assets/projects/bof-muravlenko/th.jpg",
      heroType: "image",
      heroSrc: "./assets/projects/bof-muravlenko/render1.jpg",
      intro:
        "A 300-seat waterfront restaurant sheltered beneath one continuous folded-concrete roof that " +
        "cantilevers 7 metres over the quay.",
      description: [
        "The structural challenge was the roof: a single post-tensioned concrete plate, cast in one pour, " +
        "carrying its own weight across a column-free dining room with uninterrupted harbor views.",
        "Below it, full-height sliding glass dissolves the line between inside and quayside on warm evenings."
      ],
      facts: [
        { value: "300", label: "covers" },
        { value: "7",   label: "m cantilever" },
        { value: "1",   label: "single roof pour" }
      ],
      specs: [
        { label: "Project type",  value: "New build, commercial" },
        { label: "Floor area",    value: "1,100 m²" },
        { label: "Structure",     value: "Post-tensioned folded concrete" },
        { label: "Glazing",       value: "Full-height sliding glass" },
        { label: "Duration",      value: "16 months (2022–2023)" }
      ],
      services: ["Structural engineering", "Main contractor", "Interior fit-out"],
      gallery: [
        "https://picsum.photos/seed/harbor-g1/1200/800",
        "https://picsum.photos/seed/harbor-g2/1200/800"
      ]
    },
        {
      id: "bof-eurasia",
      title: "ЖК «Европа Азия»",
      category: "Жилые здания",
      year: "2026",
      location: "г. Оренбург, Россия",
      status: "Строится",
      summary: "Eight townhouses arranged around a shared green courtyard.",
      thumb: "./assets/projects/bof-eurasia/th.webp",
      heroType: "image",
      heroSrc: "./assets/projects/bof-eurasia/th.webp",
      intro:
        "A small infill development of eight family townhouses that turn their backs on the street and " +
        "open onto a shared, planted courtyard — a quiet block within the block.",
      description: [
        "Density without compromise: each house gets private outdoor space, cross-ventilation and morning " +
        "light, while the shared courtyard does the social work of a traditional Barcelona patio.",
        "Built in two phases to keep the first residents undisturbed, the scheme uses a warm lime render " +
        "and deep window reveals to handle the Mediterranean sun."
      ],
      facts: [
        { value: "8",  label: "townhouses" },
        { value: "1",  label: "shared courtyard" },
        { value: "18", label: "month build" }
      ],
      specs: [
        { label: "Project type",  value: "New build, residential" },
        { label: "Homes",         value: "8 townhouses" },
        { label: "Gross area",    value: "2,400 m²" },
        { label: "Structure",     value: "Masonry + concrete slabs" },
        { label: "Outdoor",       value: "Private terraces + shared courtyard" },
        { label: "Duration",      value: "18 months (2021–2022)" }
      ],
      services: ["Architecture", "Main contractor", "Landscaping"],
      gallery: [
        "https://picsum.photos/seed/courtyard-g1/1200/800",
        "https://picsum.photos/seed/courtyard-g2/1200/800",
        "https://picsum.photos/seed/courtyard-g3/1200/800"
      ]
    },
    {
      id: "bof-karagand",
      title: "Жилой дом на ул. Карагандинской",
      category: "Жилые здания",
      year: "2026",
      location: "г. Оренбург, Россия",
      status: "Строится",
      summary: "Eight townhouses arranged around a shared green courtyard.",
      thumb: "./assets/projects/bof-karagand/th.png",
      heroType: "image",
      heroSrc: "./assets/projects/bof-karagand/render1.png",
      intro:
        "A small infill development of eight family townhouses that turn their backs on the street and " +
        "open onto a shared, planted courtyard — a quiet block within the block.",
      description: [
        "Density without compromise: each house gets private outdoor space, cross-ventilation and morning " +
        "light, while the shared courtyard does the social work of a traditional Barcelona patio.",
        "Built in two phases to keep the first residents undisturbed, the scheme uses a warm lime render " +
        "and deep window reveals to handle the Mediterranean sun."
      ],
      facts: [
        { value: "8",  label: "townhouses" },
        { value: "1",  label: "shared courtyard" },
        { value: "18", label: "month build" }
      ],
      specs: [
        { label: "Project type",  value: "New build, residential" },
        { label: "Homes",         value: "8 townhouses" },
        { label: "Gross area",    value: "2,400 m²" },
        { label: "Structure",     value: "Masonry + concrete slabs" },
        { label: "Outdoor",       value: "Private terraces + shared courtyard" },
        { label: "Duration",      value: "18 months (2021–2022)" }
      ],
      services: ["Architecture", "Main contractor", "Landscaping"],
      gallery: [
        "https://picsum.photos/seed/courtyard-g1/1200/800",
        "https://picsum.photos/seed/courtyard-g2/1200/800",
        "https://picsum.photos/seed/courtyard-g3/1200/800"
      ]
    },
    {
      id: "bof-bakalin",
      title: "ЖК «Платинум»",
      category: "Жилые здания",
      year: "2025",
      location: "г. Уфа, Россия",
      status: "Строится",
      summary: "Многоквартирный жилой комплекс класса комфорт-плюс",
      thumb: "./assets/projects/bof-bakalin/th.png",
      heroType: "image",
      heroSrc: "./assets/projects/bof-sd20a/th.png",
      intro:
        "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ» — это сданный многоквартирный дом типовой застройки. " +
        "В комплексе 64 квартиры: 40 однокомнатных, 8 двухкомнатных и 16 трёхкомнатных.",
      description: [
        "Жилая площадь составляет 3 239 квадратных метров. В комплексе также предусмотрено 6 нежилых помещений. Максимальная этажность здания — 10 этажей. " +
        "",
        "" +
        ""
      ],
      facts: [
        { value: "3239", label: "m² жилой площади" },
        { value: "64", label: "квартиры" },
        { value: "до 10",  label: "этажей" }
      ],
      specs: [
        { label: "Тип проекта",  value: "Жилой дом" },
        { label: "Жилая площадь",    value: "3239 m²" },
        { label: "Расположение",     value: "Микрорайон 20а" },
        { label: "Cladding",      value: "Untreated larch" },
        { label: "Heating",       value: "Ground-source heat pump" },
        { label: "Duration",      value: "11 months (2023–2024)" },
        { label: "Energy class",  value: "A+ / near passive" }
      ],
      services: ["Architecture", "Timber engineering", "Main contractor", "Renewables"],
      gallery: [
        "./assets/projects/bof-sd20a/th.png",
        "./assets/projects/bof-sd20a/ren2.png",
        "./assets/projects/bof-sd20a/r2.png"
      ]
    },
        {
      id: "inf-fokkonkovo",
      title: "ФОК «Территория Фитнеса»",
      category: "Инфраструктура",
      year: "2025",
      location: "д. Коньково, Московская обл., Россия",
      status: "Строится",
      summary: "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ»",
      thumb: "./assets/projects/bof-grandpark/th.jpg",
      heroType: "image",
      heroSrc: "./assets/projects/bof-sd20a/th.png",
      intro:
        "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ» — это сданный многоквартирный дом типовой застройки. " +
        "В комплексе 64 квартиры: 40 однокомнатных, 8 двухкомнатных и 16 трёхкомнатных.",
      description: [
        "Жилая площадь составляет 3 239 квадратных метров. В комплексе также предусмотрено 6 нежилых помещений. Максимальная этажность здания — 10 этажей. " +
        "",
        "" +
        ""
      ],
      facts: [
        { value: "3239", label: "m² жилой площади" },
        { value: "64", label: "квартиры" },
        { value: "до 10",  label: "этажей" }
      ],
      specs: [
        { label: "Тип проекта",  value: "Жилой дом" },
        { label: "Жилая площадь",    value: "3239 m²" },
        { label: "Расположение",     value: "Микрорайон 20а" },
        { label: "Cladding",      value: "Untreated larch" },
        { label: "Heating",       value: "Ground-source heat pump" },
        { label: "Duration",      value: "11 months (2023–2024)" },
        { label: "Energy class",  value: "A+ / near passive" }
      ],
      services: ["Architecture", "Timber engineering", "Main contractor", "Renewables"],
      gallery: [
        "./assets/projects/bof-sd20a/th.png",
        "./assets/projects/bof-sd20a/ren2.png",
        "./assets/projects/bof-sd20a/r2.png"
      ]
    },
    {
      id: "bof-sd20a",
      title: "ЖК «Долгие Горы»",
      category: "Жилые здания",
      year: "2025",
      location: "г. Оренбург, Россия",
      status: "В эксплуатации",
      summary: "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ»",
      thumb: "./assets/projects/bof-sd20a/th.png",
      heroType: "image",
      heroSrc: "./assets/projects/bof-sd20a/th.png",
      intro:
        "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ» — это сданный многоквартирный дом типовой застройки. " +
        "В комплексе 64 квартиры: 40 однокомнатных, 8 двухкомнатных и 16 трёхкомнатных.",
      description: [
        "Жилая площадь составляет 3 239 квадратных метров. В комплексе также предусмотрено 6 нежилых помещений. Максимальная этажность здания — 10 этажей. " +
        "",
        "" +
        ""
      ],
      facts: [
        { value: "3239", label: "m² жилой площади" },
        { value: "64", label: "квартиры" },
        { value: "до 10",  label: "этажей" }
      ],
      specs: [
        { label: "Тип проекта",  value: "Жилой дом" },
        { label: "Жилая площадь",    value: "3239 m²" },
        { label: "Расположение",     value: "Микрорайон 20а" },
        { label: "Cladding",      value: "Untreated larch" },
        { label: "Heating",       value: "Ground-source heat pump" },
        { label: "Duration",      value: "11 months (2023–2024)" },
        { label: "Energy class",  value: "A+ / near passive" }
      ],
      services: ["Architecture", "Timber engineering", "Main contractor", "Renewables"],
      gallery: [
        "./assets/projects/bof-sd20a/th.png",
        "./assets/projects/bof-sd20a/ren2.png",
        "./assets/projects/bof-sd20a/r2.png"
      ]
    },
    {
      id: "bof-grandpark",
      title: "ЖК «Гранд Парк»",
      category: "Жилые здания",
      year: "2025",
      location: "г. Оренбург, Россия",
      status: "Строится",
      summary: "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ»",
      thumb: "./assets/projects/bof-grandpark/th.jpg",
      heroType: "image",
      heroSrc: "./assets/projects/bof-sd20a/th.png",
      intro:
        "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ» — это сданный многоквартирный дом типовой застройки. " +
        "В комплексе 64 квартиры: 40 однокомнатных, 8 двухкомнатных и 16 трёхкомнатных.",
      description: [
        "Жилая площадь составляет 3 239 квадратных метров. В комплексе также предусмотрено 6 нежилых помещений. Максимальная этажность здания — 10 этажей. " +
        "",
        "" +
        ""
      ],
      facts: [
        { value: "3239", label: "m² жилой площади" },
        { value: "64", label: "квартиры" },
        { value: "до 10",  label: "этажей" }
      ],
      specs: [
        { label: "Тип проекта",  value: "Жилой дом" },
        { label: "Жилая площадь",    value: "3239 m²" },
        { label: "Расположение",     value: "Микрорайон 20а" },
        { label: "Cladding",      value: "Untreated larch" },
        { label: "Heating",       value: "Ground-source heat pump" },
        { label: "Duration",      value: "11 months (2023–2024)" },
        { label: "Energy class",  value: "A+ / near passive" }
      ],
      services: ["Architecture", "Timber engineering", "Main contractor", "Renewables"],
      gallery: [
        "./assets/projects/bof-sd20a/th.png",
        "./assets/projects/bof-sd20a/ren2.png",
        "./assets/projects/bof-sd20a/r2.png"
      ]
    },
    {
      id: "inf-mcdonaldsr",
      title: "ПБО «Вкусно - и точка»",
      category: "Инфраструктура",
      year: "2025",
      location: "пгт. Радумля, Московская обл., Россия",
      status: "Строится",
      summary: "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ»",
      thumb: "./assets/projects/bof-grandpark/th.jpg",
      heroType: "image",
      heroSrc: "./assets/projects/bof-sd20a/th.png",
      intro:
        "ЖК «Долгие горы» в Оренбурге, построенный СЗ «ЛИСТ» — это сданный многоквартирный дом типовой застройки. " +
        "В комплексе 64 квартиры: 40 однокомнатных, 8 двухкомнатных и 16 трёхкомнатных.",
      description: [
        "Жилая площадь составляет 3 239 квадратных метров. В комплексе также предусмотрено 6 нежилых помещений. Максимальная этажность здания — 10 этажей. " +
        "",
        "" +
        ""
      ],
      facts: [
        { value: "3239", label: "m² жилой площади" },
        { value: "64", label: "квартиры" },
        { value: "до 10",  label: "этажей" }
      ],
      specs: [
        { label: "Тип проекта",  value: "Жилой дом" },
        { label: "Жилая площадь",    value: "3239 m²" },
        { label: "Расположение",     value: "Микрорайон 20а" },
        { label: "Cladding",      value: "Untreated larch" },
        { label: "Heating",       value: "Ground-source heat pump" },
        { label: "Duration",      value: "11 months (2023–2024)" },
        { label: "Energy class",  value: "A+ / near passive" }
      ],
      services: ["Architecture", "Timber engineering", "Main contractor", "Renewables"],
      gallery: [
        "./assets/projects/bof-sd20a/th.png",
        "./assets/projects/bof-sd20a/ren2.png",
        "./assets/projects/bof-sd20a/r2.png"
      ]
    },
    {
      id: "bof-yrkina",
      title: "ЖК «Осенний Лист»",
      category: "Жилые здания",
      year: "2024",
      location: "г. Оренбург, Россия",
      status: "В эксплуатации",
      summary: "A glass-and-stone family home that follows the sun across the lake.",
      thumb: "./assets/projects/bof-yrkina/th.png",
      heroType: "image",
      heroSrc: "https://picsum.photos/seed/villa-aurora-hero/1920/1080",
      intro:
        "A 420 m² lakeside residence designed around a single idea: never lose the light. " +
        "Floor-to-ceiling glazing wraps the living level while a stone plinth anchors the home into the slope.",
      description: [
        "The brief asked for a home that felt open in summer and warm in winter. We answered with a " +
        "twin-skin facade — an outer stone screen and an inner glass line — that shades the interior at " +
        "midday and glows from within after dark.",
        "Built over 14 months, the project combined cast-in-place concrete, a steel feature stair, and " +
        "hand-finished oak throughout. Smart lighting lets the owners wash the stone in warm light at night."
      ],
      facts: [
        { value: "420", label: "m² floor area" },
        { value: "14",  label: "month build" },
        { value: "6",   label: "bedrooms" }
      ],
      specs: [
        { label: "Project type",   value: "New build, private residence" },
        { label: "Floor area",     value: "420 m²" },
        { label: "Plot size",      value: "1,850 m²" },
        { label: "Structure",      value: "Cast-in-place concrete + steel" },
        { label: "Facade",         value: "Limestone screen + triple glazing" },
        { label: "Duration",       value: "14 months (2023–2024)" },
        { label: "Certification",  value: "Minergie-P" }
      ],
      services: ["Architecture", "Structural engineering", "Main contractor", "Interior fit-out", "Landscaping"],
      gallery: [
        "https://picsum.photos/seed/aurora-g1/1200/800",
        "https://picsum.photos/seed/aurora-g2/1200/800",
        "https://picsum.photos/seed/aurora-g3/1200/800",
        "https://picsum.photos/seed/aurora-g4/1200/800"
      ]
    },
    {
      id: "osg-storage",
      title: "Складской комплекс ОСГ-РМ",
      category: "Промышленность",
      year: "2024",
      location: "г. Солнечногорск, МО, Россия",
      // This project uses a VIDEO as its full-width thumbnail.
      // Swap heroSrc for your own .mp4 and heroPoster for a still frame.
      heroType: "image",
      // Demo clip only — replace with your own project film (drone flyover, build timelapse…).
      heroSrc: "./assets/projects/osg-storage/render1.png",
      heroPoster: "./assets/projects/osg-storage/th.png",
      category2: "",
      thumb: "./assets/projects/osg-storage/th.png",
      year2: "",
      location2: "",
      status: "В эксплуатации",
      summary: "A red-brick warehouse reborn as 24 lofts and a ground-floor market.",
      intro:
        "An 1890s iron foundry converted into 24 live-work lofts above a public market hall — " +
        "retaining the original brick shell and crane gantry while inserting a fully modern core.",
      description: [
        "Adaptive reuse at its most demanding: we stitched a new steel frame inside the listed masonry, " +
        "underpinned the riverside foundations, and threaded services through a building never designed for them.",
        "The result keeps the soul of the old foundry — exposed brick, riveted columns, vast windows — " +
        "while delivering contemporary, energy-efficient homes and a market that brought the street back to life."
      ],
      facts: [
        { value: "24",  label: "loft homes" },
        { value: "1890", label: "original build" },
        { value: "2",   label: "year programme" }
      ],
      specs: [
        { label: "Project type",  value: "Adaptive reuse, mixed-use" },
        { label: "Gross area",    value: "6,200 m²" },
        { label: "Homes",         value: "24 live-work lofts" },
        { label: "Ground floor",  value: "Public market hall" },
        { label: "Heritage",      value: "Grade II listed shell retained" },
        { label: "Duration",      value: "24 months (2021–2023)" }
      ],
      services: ["Heritage consulting", "Structural retrofit", "Main contractor", "MEP coordination"],
      gallery: [
        "https://picsum.photos/seed/foundry-g1/1200/800",
        "https://picsum.photos/seed/foundry-g2/1200/800",
        "https://picsum.photos/seed/foundry-g3/1200/800"
      ]
    },
    {
      id: "prd-scanservice",
      title: "СТОА «СканСервис»",
      category: "Промышленность",
      year: "2022",
      location: "г. Орск, Оренбургская обл., Россия",
      // This project uses a VIDEO as its full-width thumbnail.
      // Swap heroSrc for your own .mp4 and heroPoster for a still frame.
      heroType: "image",
      // Demo clip only — replace with your own project film (drone flyover, build timelapse…).
      heroSrc: "./assets/projects/prd-scanservice/render1.png",
      heroPoster: "./assets/projects/osg-storage/th.png",
      category2: "",
      thumb: "./assets/projects/prd-scanservice/th.png",
      year2: "",
      location2: "",
      status: "В эксплуатации",
      summary: "Станция технического обслуживания автомобилей на 4 поста.",
      intro:
        "An 1890s iron foundry converted into 24 live-work lofts above a public market hall — " +
        "retaining the original brick shell and crane gantry while inserting a fully modern core.",
      description: [
        "Adaptive reuse at its most demanding: we stitched a new steel frame inside the listed masonry, " +
        "underpinned the riverside foundations, and threaded services through a building never designed for them.",
        "The result keeps the soul of the old foundry — exposed brick, riveted columns, vast windows — " +
        "while delivering contemporary, energy-efficient homes and a market that brought the street back to life."
      ],
      facts: [
        { value: "24",  label: "loft homes" },
        { value: "1890", label: "original build" },
        { value: "2",   label: "year programme" }
      ],
      specs: [
        { label: "Project type",  value: "Adaptive reuse, mixed-use" },
        { label: "Gross area",    value: "6,200 m²" },
        { label: "Homes",         value: "24 live-work lofts" },
        { label: "Ground floor",  value: "Public market hall" },
        { label: "Heritage",      value: "Grade II listed shell retained" },
        { label: "Duration",      value: "24 months (2021–2023)" }
      ],
      services: ["Heritage consulting", "Structural retrofit", "Main contractor", "MEP coordination"],
      gallery: [
        "https://picsum.photos/seed/foundry-g1/1200/800",
        "https://picsum.photos/seed/foundry-g2/1200/800",
        "https://picsum.photos/seed/foundry-g3/1200/800"
      ]
    }
  ],

  /* ---------------------------------------------------------------------------
     7b) NEWS FEED — cards shown after the projects block. Clicking a card opens
         a modal (over a blurred page) with the thumbnail, date, title and text.
         `body` may be a single string or an array of paragraphs.
     ------------------------------------------------------------------------ */
  news: {
    eyebrow: "Новости",
    title: "Что нового",
    subtitle: "События компании, новые объекты и отраслевые новости.",
    items: [
      {
        id: "industrial-inspection",
        date: "2026-07-08",
        title: "Продолжается работа с подрядчиками по всей России",
        thumb: "./assets/projects/bof-karagand/th.png",
        body: [
          "Мы завершили строительство блочно-обогатительной фабрики в Караганде — одного из крупнейших объектов компании за последний год.",
          "Проект включал полный цикл работ: от инженерных изысканий и проектирования до сдачи объекта в эксплуатацию. Все этапы выполнены в установленные сроки и с соблюдением требований к качеству."
        ]
      },
      {
        id: "smk-concrete",
        date: "2026-04-08",
        title: "Использование технологии сборно-монолитного каркаса",
        thumb: "./assets/projects/osg-storage/th.png",
        body: [
          "Подписан контракт на проектирование современного логистического комплекса площадью более 24 000 м².",
          "Комплекс объединит складские, административные и технические зоны. Старт работ запланирован на ближайший квартал."
        ]
      },
      {
        id: "ai-in-industry",
        date: "2026-02-21",
        title: "Внедрение ИИ в проектирование",
        thumb: "https://picsum.photos/seed/promtech-expo/1200/800",
        body: [
          "Команда компании приняла участие в ежегодной отраслевой выставке, представив актуальные проекты и инженерные решения.",
          "Спасибо всем, кто посетил наш стенд — впереди новые совместные проекты."
        ]
      }
    ]
  },

  /* ---------------------------------------------------------------------------
     8) CONTACT + FOOTER
     ------------------------------------------------------------------------ */
  contact: {
    eyebrow: "Открыты вашим идеям",
    title: "Начнём обсуждение вашего проекта.",
    text: "Расскажите нам о своем проекте. Будем рады сотрудничеству. Срок обработки заявок: не более 2-ух рабочих дней.",
    email: "-",
    phone: "-",
    address: "-",
    formAction: "" // leave empty for demo; add your endpoint to receive submissions
  },

  /* ---------------------------------------------------------------------------
     8b) LEGAL / ПРАВОВАЯ ИНФОРМАЦИЯ (152-ФЗ)
         Powers the privacy page (privacy.html), the consent checkbox next to the
         contact form, and the cookie notice. Fill the requisites with the real
         company data. IMPORTANT: submissions must be stored on a server located
         in Russia (242-ФЗ), and the operator must be registered with Роскомнадзор.
     ------------------------------------------------------------------------ */
  legal: {
    // Company requisites shown on the privacy page — REPLACE with real values.
    companyLegalName: "ООО «-»",
    inn:  "0000000000",
    kpp:  "000000000",
    ogrn: "0000000000000",
    // Effective date of the current policy version.
    policyDate: "16 июля 2026 г.",

    // Consent checkbox rendered next to the contact form. The submit button is
    // disabled until the box is ticked (enforced in main.js).
    consent: {
      text: "Я даю согласие на обработку персональных данных и принимаю",
      linkLabel: "политику конфиденциальности",
      href: "privacy.html"
    },

    // Cookie notice — shown once, choice stored in localStorage. Because the site
    // will use веб-аналитику (Яндекс.Метрика), informing about cookies is required.
    cookie: {
      text: "Мы используем файлы cookie и сервисы веб-аналитики (в т.ч. Яндекс.Метрика), " +
            "чтобы сайт работал корректно и становился удобнее. Продолжая пользоваться сайтом, " +
            "вы соглашаетесь с обработкой cookie в соответствии с",
      linkLabel: "политикой конфиденциальности",
      href: "privacy.html",
      accept: "Принять",
      decline: "Отклонить"
    }
  },

  footer: {
    blurb: "Design-led construction studio. Private residences and developments, from first sketch to keys.",
    columns: [
      {
        title: "Studio",
        links: [
          { label: "About",    href: "#about" },
          { label: "Projects", href: "#portfolio" },
          { label: "Contact",  href: "#contact" }
        ]
      },
      {
        title: "Social",
        links: [
          { label: "Instagram", href: "#" },
          { label: "LinkedIn",  href: "#" },
          { label: "Behance",   href: "#" }
        ]
      }
    ]
  }
};
