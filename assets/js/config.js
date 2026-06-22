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
      { value: 100, suffix: "%",  label: "On-time handover" }
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
    values: [
      { title: "Деятельность 1", text: "текст..." },
      { title: "Деятельность 2", text: "текст..." },
      { title: "Деятельность 3", text: "текст..." },
      { title: "Деятельность 4", text: "текст..." }
    ],
    image: "./assets/models/hq.png"
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
    subtitle: "Пространства, где инженерная точность встречается с эстетикой. Приглашаем изучить проектные решения для жилых, коммерческих и общественных объектов, разработанные ГК «Промтех Групп».",
    filtersEnabled: true
  },

  projects: [
    {
      id: "bof-yrkina",
      title: "Жилой дом на ул. Юркина",
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
      heroSrc: "./assets/projects/osg-storage/th.png",
      heroPoster: "./assets/projects/osg-storage/th.png",
      category2: "",
      thumb: "./assets/projects/osg-storage/th.png",
      year2: "",
      location2: "",
      status: "Completed",
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
      id: "bof-sd20a",
      title: "Жилой комплекс в 20а мкрн.",
      category: "Жилые здания",
      year: "2025",
      location: "г. Оренбург, Россия",
      status: "Строится",
      summary: "A timber home that disappears into the mountain ridge.",
      thumb: "./assets/projects/bof-sd20a/th.png",
      heroType: "image",
      heroSrc: "./assets/projects/bof-sd20a/th.png",
      intro:
        "A low, larch-clad residence built along a 1,600 m ridge line, engineered to shrug off heavy " +
        "snow loads while framing the valley through a single 9-metre window.",
      description: [
        "Working at altitude meant a tight summer build window and helicopter-delivered materials. We " +
        "prefabricated the timber frame in the valley and assembled it on site in just five weeks.",
        "Triple-glazing, a ground-source heat pump and 300 mm of insulation keep the home warm through " +
        "alpine winters with almost no bought-in energy."
      ],
      facts: [
        { value: "310", label: "m² floor area" },
        { value: "1600", label: "m altitude" },
        { value: "A+",  label: "energy class" }
      ],
      specs: [
        { label: "Project type",  value: "New build, private residence" },
        { label: "Floor area",    value: "310 m²" },
        { label: "Structure",     value: "Prefabricated CLT timber frame" },
        { label: "Cladding",      value: "Untreated larch" },
        { label: "Heating",       value: "Ground-source heat pump" },
        { label: "Duration",      value: "11 months (2023–2024)" },
        { label: "Energy class",  value: "A+ / near passive" }
      ],
      services: ["Architecture", "Timber engineering", "Main contractor", "Renewables"],
      gallery: [
        "https://picsum.photos/seed/ridge-g1/1200/800",
        "https://picsum.photos/seed/ridge-g2/1200/800",
        "https://picsum.photos/seed/ridge-g3/1200/800"
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
      id: "elm-terrace",
      title: "Elm Terrace",
      category: "Renovation",
      year: "2025",
      location: "Hampstead, London",
      status: "In progress",
      summary: "A Victorian terrace stripped back, rebuilt and quietly extended.",
      thumb: "https://picsum.photos/seed/elm/900/1100",
      heroType: "image",
      heroSrc: "https://picsum.photos/seed/elm-hero/1920/1080",
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
    }
  ],

  /* ---------------------------------------------------------------------------
     8) CONTACT + FOOTER
     ------------------------------------------------------------------------ */
  contact: {
    eyebrow: "Открыты вашим идеям",
    title: "Have a site, a sketch, or just an idea?",
    text: "Расскажите нам о своем проекте. Будем рады сотрудничеству. Срок обработки заявок: не более 2-ух рабочих дней.",
    email: "stolpovskij@mail.ru",
    phone: "+7 922 895 77 11",
    address: "ул. Терешковой, 103, 460018, Оренбург, Россия",
    formAction: "" // leave empty for demo; add your endpoint to receive submissions
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
